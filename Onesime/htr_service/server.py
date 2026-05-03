#!/usr/bin/env python3
"""Onésime HTR Service — transcription automatique de manuscrits historiques.

Moteur : Ollama + Qwen2.5-VL (vision pleine page, pas de segmentation nécessaire)
Fallback : TrOCR-fr ligne par ligne si Ollama n'est pas disponible
"""
from __future__ import annotations
import base64, os, sys, subprocess, threading, traceback
from pathlib import Path
from typing import Optional

import requests
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Répertoires ────────────────────────────────────────────────────────────────
DATA_DIR = Path(os.getenv('HTR_DATA_DIR', Path.home() / '.onesime' / 'htr'))
MODELS_DIR = DATA_DIR / 'models'
GT_DIR = DATA_DIR / 'ground_truth'
CUSTOM_MODEL_DIR = MODELS_DIR / 'fine_tuned'
for _d in [MODELS_DIR, GT_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen2.5-vl:7b')
TROCR_MODEL = 'agomberto/trocr-large-handwritten-fr'

PROMPT_TRANSCRIPTION = (
    "Transcris intégralement le texte manuscrit de cet acte d'état civil ou registre "
    "paroissial (BMS). Respecte la mise en forme et les sauts de ligne d'origine. "
    "Ne corrige pas les fautes d'orthographe ni la ponctuation ancienne. "
    "Transcris uniquement le texte visible, sans commentaire ni explication."
)

# ── État global ────────────────────────────────────────────────────────────────
_engine: str = 'checking'   # 'ollama' | 'trocr' | 'none'
_trocr_processor = None
_trocr_model = None
_device = 'cpu'
_loading = False
_loading_error: Optional[str] = None
_train_proc: Optional[subprocess.Popen] = None


def _check_ollama() -> bool:
    try:
        r = requests.get(f'{OLLAMA_URL}/api/tags', timeout=3)
        if r.status_code != 200:
            return False
        models = [m['name'] for m in r.json().get('models', [])]
        # Vérifie si le modèle (ou une variante) est disponible
        base = OLLAMA_MODEL.split(':')[0]
        return any(base in m for m in models)
    except Exception:
        return False


def _pull_ollama_model():
    """Télécharge le modèle Ollama en arrière-plan si absent."""
    global _engine, _loading, _loading_error
    _loading = True
    try:
        print(f'[HTR] Téléchargement de {OLLAMA_MODEL} via Ollama…', flush=True)
        r = requests.post(f'{OLLAMA_URL}/api/pull', json={'name': OLLAMA_MODEL}, stream=True, timeout=600)
        for line in r.iter_lines():
            if line:
                import json
                d = json.loads(line)
                if 'status' in d:
                    print(f'[HTR] Ollama : {d["status"]}', flush=True)
        _engine = 'ollama'
        print(f'[HTR] Modèle {OLLAMA_MODEL} prêt', flush=True)
    except Exception as e:
        _loading_error = str(e)
        print(f'[HTR] Erreur pull Ollama : {e}', file=sys.stderr, flush=True)
        _engine = 'none'
    finally:
        _loading = False


def _load_trocr():
    """Charge TrOCR-fr comme fallback."""
    global _trocr_processor, _trocr_model, _device, _engine, _loading, _loading_error
    _loading = True
    try:
        import torch
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        _device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f'[HTR] Chargement TrOCR-fr sur {_device}…', flush=True)
        model_path = str(CUSTOM_MODEL_DIR) if CUSTOM_MODEL_DIR.exists() else TROCR_MODEL
        _trocr_processor = TrOCRProcessor.from_pretrained(TROCR_MODEL)
        _trocr_model = VisionEncoderDecoderModel.from_pretrained(model_path).to(_device)
        _trocr_model.eval()
        _engine = 'trocr'
        print(f'[HTR] TrOCR-fr prêt', flush=True)
    except Exception as e:
        _loading_error = str(e)
        _engine = 'none'
        print(f'[HTR] Erreur TrOCR : {e}', file=sys.stderr, flush=True)
    finally:
        _loading = False


def _init_engine():
    global _engine, _loading
    _loading = True
    _engine = 'checking'
    try:
        # 1. Ollama disponible avec modèle déjà téléchargé ?
        if _check_ollama():
            _engine = 'ollama'
            _loading = False
            print(f'[HTR] Moteur : Ollama ({OLLAMA_MODEL})', flush=True)
            return
        # 2. Ollama disponible mais modèle absent → téléchargement
        r = requests.get(f'{OLLAMA_URL}/api/tags', timeout=3)
        if r.status_code == 200:
            print(f'[HTR] Ollama détecté, téléchargement de {OLLAMA_MODEL}…', flush=True)
            _loading = False
            threading.Thread(target=_pull_ollama_model, daemon=True).start()
            return
    except Exception:
        pass
    # 3. Fallback TrOCR-fr
    print('[HTR] Ollama non disponible → fallback TrOCR-fr', flush=True)
    _loading = False
    threading.Thread(target=_load_trocr, daemon=True).start()


threading.Thread(target=_init_engine, daemon=True).start()

# ── Helpers ────────────────────────────────────────────────────────────────────

def _transcribe_ollama(img_path: str) -> str:
    with open(img_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    r = requests.post(f'{OLLAMA_URL}/api/generate', json={
        'model': OLLAMA_MODEL,
        'prompt': PROMPT_TRANSCRIPTION,
        'images': [img_b64],
        'stream': False,
        'options': {'temperature': 0.1},
    }, timeout=120)
    r.raise_for_status()
    return r.json().get('response', '').strip()


def _segment_lines_cv(img_path: str) -> list:
    """Segmentation OpenCV pour TrOCR (fallback)."""
    import cv2
    import numpy as np
    from PIL import Image

    img = Image.open(img_path).convert('RGB')
    img_np = np.array(img)
    h_img, w_img = img_np.shape[:2]

    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (50, 3))
    dilated = cv2.dilate(binary, kernel, iterations=1)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    bboxes = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w < 60 or h < 8:
            continue
        bboxes.append((max(0, x - 4), max(0, y - 5), min(w_img, x + w + 4), min(h_img, y + h + 5)))
    bboxes.sort(key=lambda b: b[1])
    return [img.crop(b) for b in bboxes]


def _transcribe_trocr(img_path: str) -> str:
    import torch
    lines = _segment_lines_cv(img_path)
    results = []
    for line_img in lines:
        try:
            pv = _trocr_processor(line_img, return_tensors='pt').pixel_values.to(_device)
            with torch.no_grad():
                ids = _trocr_model.generate(pv)
            text = _trocr_processor.batch_decode(ids, skip_special_tokens=True)[0]
            if text.strip():
                results.append(text)
        except Exception:
            continue
    return '\n'.join(results)


# ── API ────────────────────────────────────────────────────────────────────────
app = FastAPI(title='Onésime HTR')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])


@app.get('/status')
def status():
    ready = _engine in ('ollama', 'trocr')
    return {
        'ok': True,
        'model_ready': ready,
        'model_loading': _loading,
        'model_error': _loading_error,
        'engine': _engine,
        'model': OLLAMA_MODEL if _engine == 'ollama' else (TROCR_MODEL if _engine == 'trocr' else None),
        'device': _device if _engine == 'trocr' else 'gpu/cpu (Ollama)',
        'gt_count': len(list(GT_DIR.glob('*.txt'))),
        'has_custom_model': CUSTOM_MODEL_DIR.exists(),
    }


class TranscribeReq(BaseModel):
    file_path: str


@app.post('/transcribe')
def transcribe(req: TranscribeReq):
    if _engine == 'checking' or _loading:
        return {'ok': False, 'error': 'Moteur en cours d\'initialisation…'}
    if _engine == 'none':
        return {'ok': False, 'error': _loading_error or 'Aucun moteur disponible'}
    try:
        if _engine == 'ollama':
            text = _transcribe_ollama(req.file_path)
        else:
            text = _transcribe_trocr(req.file_path)
        return {'ok': True, 'transcription': text, 'engine': _engine}
    except Exception as e:
        traceback.print_exc()
        return {'ok': False, 'error': str(e)}


class CorrectionReq(BaseModel):
    acte_id: str
    file_path: str
    transcription: str


@app.post('/correction')
def save_correction(req: CorrectionReq):
    try:
        (GT_DIR / f'{req.acte_id}.txt').write_text(req.transcription, encoding='utf-8')
        (GT_DIR / f'{req.acte_id}.img').write_text(req.file_path, encoding='utf-8')
        count = len(list(GT_DIR.glob('*.txt')))
        return {'ok': True, 'count': count}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


@app.post('/train')
def train():
    global _train_proc
    if _engine != 'trocr':
        return {'ok': False, 'error': 'L\'entraînement n\'est disponible qu\'avec le moteur TrOCR'}
    gt_count = len(list(GT_DIR.glob('*.txt')))
    if gt_count < 10:
        return {'ok': False, 'error': f'Minimum 10 corrections requises ({gt_count} actuellement)'}
    if _train_proc and _train_proc.poll() is None:
        return {'ok': False, 'error': 'Entraînement déjà en cours'}
    worker = Path(__file__).parent / 'train_worker.py'
    _train_proc = subprocess.Popen(
        [sys.executable, str(worker), str(DATA_DIR), TROCR_MODEL],
        stdout=open(DATA_DIR / 'train.log', 'w', encoding='utf-8'),
        stderr=subprocess.STDOUT,
    )
    return {'ok': True, 'pid': _train_proc.pid}


@app.get('/train/status')
def train_status():
    last_log = ''
    try:
        log_path = DATA_DIR / 'train.log'
        if log_path.exists():
            lines = log_path.read_text(encoding='utf-8').strip().splitlines()
            last_log = lines[-1] if lines else ''
    except Exception:
        pass
    if _train_proc is None:
        return {'running': False, 'status': 'idle', 'last_log': last_log}
    rc = _train_proc.poll()
    if rc is None:
        return {'running': True, 'status': 'training', 'last_log': last_log}
    return {'running': False, 'status': 'done' if rc == 0 else 'error', 'returncode': rc, 'last_log': last_log}


if __name__ == '__main__':
    port = int(os.getenv('HTR_PORT', '7842'))
    uvicorn.run(app, host='127.0.0.1', port=port, log_level='warning')
