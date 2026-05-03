#!/usr/bin/env python3
"""Fine-tuning TrOCR-fr sur les corrections validées par l'utilisateur.

Usage : python train_worker.py <data_dir> <base_model>
"""
from __future__ import annotations
import sys
from pathlib import Path


def extract_line_pairs(img_path: str, transcription: str, output_dir: Path, prefix: str) -> int:
    """Segmente l'image en lignes et crée des paires (image, texte) pour l'entraînement."""
    import cv2
    import numpy as np
    from PIL import Image

    img = Image.open(img_path).convert('RGB')
    img_np = np.array(img)
    h_img, w_img = img_np.shape[:2]

    text_lines = [l.strip() for l in transcription.strip().splitlines() if l.strip()]
    if not text_lines:
        return 0

    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (60, 4))
    dilated = cv2.dilate(binary, kernel, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    bboxes = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w < 80 or h < 8:
            continue
        bboxes.append((max(0, x - 4), max(0, y - 6), min(w_img, x + w + 4), min(h_img, y + h + 6)))
    bboxes.sort(key=lambda b: b[1])

    pairs = 0
    for i, (bbox, gt_text) in enumerate(zip(bboxes, text_lines)):
        try:
            crop = img.crop(bbox)
            name = f'{prefix}_{i:04d}'
            crop.save(output_dir / f'{name}.png')
            (output_dir / f'{name}.gt.txt').write_text(gt_text, encoding='utf-8')
            pairs += 1
        except Exception as e:
            print(f'  Ligne {i} ignorée : {e}', flush=True)

    return pairs


def main():
    data_dir = Path(sys.argv[1])
    base_model = sys.argv[2] if len(sys.argv) > 2 else 'agomberto/trocr-large-handwritten-fr'

    gt_dir = data_dir / 'ground_truth'
    pairs_dir = data_dir / 'train_pairs'
    output_dir = data_dir / 'models' / 'fine_tuned'
    pairs_dir.mkdir(exist_ok=True)

    # Nettoyage des anciennes paires
    for f in pairs_dir.glob('*'):
        f.unlink(missing_ok=True)

    print('=== Préparation des données ===', flush=True)
    total_pairs = 0
    for txt_file in sorted(gt_dir.glob('*.txt')):
        img_file = gt_dir / (txt_file.stem + '.img')
        if not img_file.exists():
            continue
        img_path = img_file.read_text().strip()
        if not Path(img_path).exists():
            print(f'  Image introuvable : {img_path}', flush=True)
            continue
        transcription = txt_file.read_text(encoding='utf-8')
        n = extract_line_pairs(img_path, transcription, pairs_dir, txt_file.stem)
        print(f'  {txt_file.stem} : {n} paires', flush=True)
        total_pairs += n

    print(f'Total : {total_pairs} paires de lignes', flush=True)
    if total_pairs < 5:
        print(f'ERREUR : seulement {total_pairs} paires (minimum 5 requises)', flush=True)
        sys.exit(1)

    print('=== Chargement du modèle de base ===', flush=True)
    import torch
    from transformers import (
        TrOCRProcessor,
        VisionEncoderDecoderModel,
        TrainingArguments,
        Trainer,
        default_data_collator,
    )
    from PIL import Image

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f'Device : {device}', flush=True)

    processor = TrOCRProcessor.from_pretrained(base_model)
    model = VisionEncoderDecoderModel.from_pretrained(base_model).to(device)
    model.config.decoder_start_token_id = processor.tokenizer.cls_token_id
    model.config.pad_token_id = processor.tokenizer.pad_token_id

    print('=== Création du dataset ===', flush=True)

    class LineDataset(torch.utils.data.Dataset):
        def __init__(self, samples):
            self.samples = samples

        def __len__(self):
            return len(self.samples)

        def __getitem__(self, i):
            png, txt = self.samples[i]
            img = Image.open(png).convert('RGB')
            gt = Path(txt).read_text(encoding='utf-8').strip()
            enc = processor(
                img,
                text_target=gt,
                return_tensors='pt',
                padding='max_length',
                max_length=128,
                truncation=True,
            )
            labels = enc.labels.squeeze()
            labels[labels == processor.tokenizer.pad_token_id] = -100
            return {'pixel_values': enc.pixel_values.squeeze(), 'labels': labels}

    png_files = sorted(pairs_dir.glob('*.png'))
    samples = [(p, p.with_suffix('.gt.txt')) for p in png_files if p.with_suffix('.gt.txt').exists()]

    split = max(1, len(samples) // 10)
    train_ds = LineDataset(samples[split:])
    eval_ds = LineDataset(samples[:split])
    print(f'Train : {len(train_ds)}, Eval : {len(eval_ds)}', flush=True)

    print('=== Entraînement ===', flush=True)
    args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=10,
        per_device_train_batch_size=4,
        per_device_eval_batch_size=4,
        warmup_steps=50,
        weight_decay=0.01,
        logging_steps=10,
        eval_strategy='epoch',
        save_strategy='best',
        load_best_model_at_end=True,
        report_to='none',
        use_cpu=(device == 'cpu'),
        dataloader_num_workers=0,
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        data_collator=default_data_collator,
    )

    trainer.train()
    trainer.save_model(str(output_dir))
    print(f'=== Entraînement terminé — modèle sauvegardé dans {output_dir} ===', flush=True)


if __name__ == '__main__':
    main()
