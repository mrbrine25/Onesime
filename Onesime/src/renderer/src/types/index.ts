export interface Archive {
  id: string
  name: string
  root_path: string
  description: string
  created_at: string
  updated_at: string
}

export interface AvatarZone {
  id: string
  x: number; y: number; width: number; height: number
  doc_file_path: string
}

export interface Fiche {
  id: string
  archive_id: string
  title: string
  description: string
  date: string
  avatar_zone_id: string | null
  avatar_zone?: AvatarZone | null
  documents?: Document[]
  document_count?: number
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  archive_id: string
  fiche_id: string | null
  file_path: string
  filename: string
  mime_type: string
  title: string
  description: string
  transcription: string
  date: string
  location?: string
  linked_document_id: string | null
  link_type: string
  zones?: Zone[]
  created_at: string
  updated_at: string
  rotation?: number
  crop_x?: number
  crop_y?: number
  crop_w?: number
  crop_h?: number
  brightness?: number
  contrast?: number
  flip_h?: number
  flip_v?: number
}

export interface Zone {
  id: string
  document_id: string
  x: number
  y: number
  width: number
  height: number
  label: string
  notes: string
  transcription: string
  face_descriptor?: string | null
  persons?: Person[]
  created_at: string
}

export interface FaceZone {
  id: string
  document_id: string
  x: number; y: number; width: number; height: number
  label: string
  face_descriptor: string
  doc_file_path: string
  doc_title: string
  doc_filename: string
  doc_id: string
  first_name: string | null
  last_name: string | null
}

export interface Person {
  id: string
  archive_id: string
  first_name: string
  last_name: string
  birth_date: string
  death_date: string
  birth_place: string
  death_place: string
  notes: string
  avatar_zone_id: string | null
  avatar_zone?: AvatarZone | null
  created_at: string
  updated_at: string
}

export interface PersonZone extends Zone {
  doc_file_path: string
  doc_filename: string
  doc_title: string
  doc_id: string
}

export interface PersonDetail extends Person {
  zones: PersonZone[]
}

export interface FileEntry {
  name: string
  path: string
  full_path: string
  is_dir: boolean
  size: number
  ext: string
}

export interface SearchResult {
  type: 'fiche' | 'document' | 'person'
  id: string
  label: string
  extra: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface AlbumDocument extends Document {
  album_caption: string
  album_rotation: number
  album_crop_x: number
  album_crop_y: number
  album_crop_w: number
  album_crop_h: number
  album_brightness: number
  album_contrast: number
  album_flip_h: number
  album_flip_v: number
  album_position: number
}

// ── Archives module types ──────────────────────────────────────────────────────

export type TypeActe = 'naissance' | 'bapteme' | 'mariage' | 'bans' | 'deces' | 'sepulture' | 'contrat_mariage' | 'inventaire' | 'recensement' | 'acte_notarie' | 'naturalisation' | 'autre'
export type RolePartie = 'principal' | 'pere' | 'mere' | 'epoux' | 'epouse' | 'parrain' | 'marraine' | 'temoin' | 'officiant' | 'declarant' | 'autre'

export interface ActePartie {
  id?: string; acte_id?: string; prenom: string; nom: string
  age: string; profession: string; domicile: string; role: RolePartie; notes: string; ordre?: number
}

export interface Acte {
  id: string; archive_id: string
  file_path: string; filename: string
  registre_id: string | null; registre_nom?: string
  lieu_nom: string; type_acte: TypeActe; date_acte: string; date_precision: string
  folio: string; acte_num: string; description: string; transcription: string; notes: string
  principals?: string; parties?: ActePartie[]; created_at: string; updated_at: string
}

export interface Registre {
  id: string; archive_id: string; nom: string; type_registre: string
  default_type_acte: string; default_lieu_nom: string
  date_debut: string; date_fin: string; lieu_nom: string
  description: string; notes: string; acte_count?: number
  actes?: Acte[]; created_at: string; updated_at: string
}

export const TYPE_ACTE_LABELS: Record<string, string> = {
  naissance: 'Naissance', bapteme: 'Baptême', mariage: 'Mariage', bans: 'Publication de bans',
  deces: 'Décès', sepulture: 'Sépulture', contrat_mariage: 'Contrat de mariage',
  inventaire: 'Inventaire après décès', recensement: 'Recensement',
  acte_notarie: 'Acte notarié', naturalisation: 'Naturalisation', autre: 'Autre',
}

export const TYPE_ACTE_COLORS: Record<string, string> = {
  naissance: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  bapteme: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  mariage: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  bans: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  deces: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  sepulture: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  contrat_mariage: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  inventaire: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  recensement: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  acte_notarie: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  naturalisation: 'bg-green-500/20 text-green-300 border-green-500/30',
  autre: 'bg-navy-600/60 text-slate-400 border-navy-600',
}

export const ROLE_LABELS: Record<string, string> = {
  principal: 'Principal·e', pere: 'Père', mere: 'Mère', epoux: 'Époux', epouse: 'Épouse',
  parrain: 'Parrain', marraine: 'Marraine', temoin: 'Témoin', officiant: 'Officiant',
  declarant: 'Déclarant', autre: 'Autre',
}

export const TYPE_REGISTRE_LABELS: Record<string, string> = {
  bms: 'Registre BMS', etat_civil: 'État civil', notaire: 'Notaire',
  cadastre: 'Cadastre', recensement: 'Recensement', correspondance: 'Correspondance',
  autre: 'Autre',
}

export interface Album {
  id: string
  archive_id: string
  name: string
  description: string
  cover_doc_id: string | null
  documents?: AlbumDocument[]
  created_at: string
  updated_at: string
}
