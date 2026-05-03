import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Dialog
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectFolder'),

  // Archives
  getArchives: () => ipcRenderer.invoke('archives:list'),
  createArchive: (data: object) => ipcRenderer.invoke('archives:create', data),
  updateArchive: (id: string, data: object) => ipcRenderer.invoke('archives:update', id, data),
  deleteArchive: (id: string) => ipcRenderer.invoke('archives:delete', id),

  // Files
  browseArchive: (archiveId: string, path: string) => ipcRenderer.invoke('files:browse', archiveId, path),
  browseArchiveAll: (archiveId: string, path: string) => ipcRenderer.invoke('files:browseAll', archiveId, path),

  // Fiches
  getFiches: (archiveId: string) => ipcRenderer.invoke('fiches:list', archiveId),
  createFiche: (archiveId: string, data: object) => ipcRenderer.invoke('fiches:create', archiveId, data),
  getFiche: (ficheId: string) => ipcRenderer.invoke('fiches:get', ficheId),
  updateFiche: (ficheId: string, data: object) => ipcRenderer.invoke('fiches:update', ficheId, data),
  deleteFiche: (ficheId: string) => ipcRenderer.invoke('fiches:delete', ficheId),
  addDocumentToFiche: (ficheId: string, docId: string) => ipcRenderer.invoke('fiches:addDocument', ficheId, docId),
  removeDocumentFromFiche: (ficheId: string, docId: string) => ipcRenderer.invoke('fiches:removeDocument', ficheId, docId),
  setFicheAvatar: (ficheId: string, zoneId: string | null) => ipcRenderer.invoke('fiches:setAvatar', ficheId, zoneId),

  // Documents
  getDocuments: (archiveId: string) => ipcRenderer.invoke('documents:list', archiveId),
  getRecentDocuments: (archiveId: string) => ipcRenderer.invoke('documents:recentForHome', archiveId),
  createDocument: (archiveId: string, data: object) => ipcRenderer.invoke('documents:create', archiveId, data),
  getDocument: (docId: string) => ipcRenderer.invoke('documents:get', docId),
  updateDocument: (docId: string, data: object) => ipcRenderer.invoke('documents:update', docId, data),
  deleteDocument: (docId: string) => ipcRenderer.invoke('documents:delete', docId),
  linkDocuments: (docId: string, linkedId: string, type: string) => ipcRenderer.invoke('documents:link', docId, linkedId, type),
  unlinkDocument: (docId: string) => ipcRenderer.invoke('documents:unlink', docId),

  // Zones
  createZone: (docId: string, data: object) => ipcRenderer.invoke('zones:create', docId, data),
  updateZone: (zoneId: string, data: object) => ipcRenderer.invoke('zones:update', zoneId, data),
  deleteZone: (zoneId: string) => ipcRenderer.invoke('zones:delete', zoneId),
  addPersonToZone: (zoneId: string, personId: string) => ipcRenderer.invoke('zones:addPerson', zoneId, personId),
  removePersonFromZone: (zoneId: string, personId: string) => ipcRenderer.invoke('zones:removePerson', zoneId, personId),
  listZoneLabels: (archiveId: string) => ipcRenderer.invoke('zones:listLabels', archiveId),
  getZonesWithFace: (archiveId: string) => ipcRenderer.invoke('zones:withFace', archiveId),
  getZonesAllLabeled: (archiveId: string) => ipcRenderer.invoke('zones:allLabeled', archiveId),

  // Thumbnails (cached in main process, return data URL)
  getThumbnail: (filePath: string, maxPx: number) => ipcRenderer.invoke('doc:thumbnail', filePath, maxPx),

  // Persons
  getPersons: (archiveId?: string, q?: string) => ipcRenderer.invoke('persons:list', archiveId || '', q),
  getPerson: (personId: string) => ipcRenderer.invoke('persons:get', personId),
  createPerson: (archiveId: string, data: object) => ipcRenderer.invoke('persons:create', archiveId, data),
  updatePerson: (personId: string, data: object) => ipcRenderer.invoke('persons:update', personId, data),
  deletePerson: (personId: string) => ipcRenderer.invoke('persons:delete', personId),
  setPersonAvatar: (personId: string, zoneId: string | null) => ipcRenderer.invoke('persons:setAvatar', personId, zoneId),

  // Tags
  getTags: () => ipcRenderer.invoke('tags:list'),
  createTag: (data: object) => ipcRenderer.invoke('tags:create', data),
  updateTag: (tagId: string, data: object) => ipcRenderer.invoke('tags:update', tagId, data),
  deleteTag: (tagId: string) => ipcRenderer.invoke('tags:delete', tagId),
  getTagsForDocument: (docId: string) => ipcRenderer.invoke('tags:forDocument', docId),
  addTagToDocument: (docId: string, tagId: string) => ipcRenderer.invoke('tags:addToDocument', docId, tagId),
  removeTagFromDocument: (docId: string, tagId: string) => ipcRenderer.invoke('tags:removeFromDocument', docId, tagId),
  getTagsForFiche: (ficheId: string) => ipcRenderer.invoke('tags:forFiche', ficheId),
  addTagToFiche: (ficheId: string, tagId: string) => ipcRenderer.invoke('tags:addToFiche', ficheId, tagId),
  removeTagFromFiche: (ficheId: string, tagId: string) => ipcRenderer.invoke('tags:removeFromFiche', ficheId, tagId),
  getTagCounts: () => ipcRenderer.invoke('tags:counts'),
  getDocumentsForTag: (tagId: string) => ipcRenderer.invoke('tags:documents', tagId),

  // Albums
  getAlbums: (archiveId: string) => ipcRenderer.invoke('albums:list', archiveId),
  createAlbum: (archiveId: string, data: object) => ipcRenderer.invoke('albums:create', archiveId, data),
  getAlbum: (albumId: string) => ipcRenderer.invoke('albums:get', albumId),
  updateAlbum: (albumId: string, data: object) => ipcRenderer.invoke('albums:update', albumId, data),
  deleteAlbum: (albumId: string) => ipcRenderer.invoke('albums:delete', albumId),
  addDocumentToAlbum: (albumId: string, docId: string) => ipcRenderer.invoke('albums:addDocument', albumId, docId),
  addDocumentsToAlbum: (albumId: string, docIds: string[]) => ipcRenderer.invoke('albums:addDocuments', albumId, docIds),
  removeDocumentFromAlbum: (albumId: string, docId: string) => ipcRenderer.invoke('albums:removeDocument', albumId, docId),
  updateAlbumDocEntry: (albumId: string, docId: string, data: object) => ipcRenderer.invoke('albums:updateDocEntry', albumId, docId, data),
  reorderAlbum: (albumId: string, docIds: string[]) => ipcRenderer.invoke('albums:reorder', albumId, docIds),

  // Merge
  mergePersons: (sourceId: string, targetId: string) => ipcRenderer.invoke('persons:merge', sourceId, targetId),
  mergeFiches: (sourceId: string, targetId: string) => ipcRenderer.invoke('fiches:merge', sourceId, targetId),

  // Archive notes / stats / duplicates / backup
  getArchiveNotes: (archiveId: string) => ipcRenderer.invoke('archive:notes:get', archiveId),
  setArchiveNotes: (archiveId: string, notes: string) => ipcRenderer.invoke('archive:notes:set', archiveId, notes),
  getArchiveStats: (archiveId: string) => ipcRenderer.invoke('archive:stats', archiveId),
  getArchiveDuplicates: (archiveId: string) => ipcRenderer.invoke('archive:duplicates', archiveId),
  backupArchive: () => ipcRenderer.invoke('archive:backup'),

  // Archives module — Actes
  getActes: (archiveId: string, filters?: object) => ipcRenderer.invoke('actes:list', archiveId, filters),
  getActe: (acteId: string) => ipcRenderer.invoke('actes:get', acteId),
  createActe: (archiveId: string, data: object) => ipcRenderer.invoke('actes:create', archiveId, data),
  updateActe: (acteId: string, data: object) => ipcRenderer.invoke('actes:update', acteId, data),
  deleteActe: (acteId: string) => ipcRenderer.invoke('actes:delete', acteId),
  importActeFiles: (archiveId: string) => ipcRenderer.invoke('actes:importFiles', archiveId),
  setActeParties: (acteId: string, parties: object[]) => ipcRenderer.invoke('actes:parties:set', acteId, parties),
  getActeStats: (archiveId: string) => ipcRenderer.invoke('actes:stats', archiveId),
  // Archives module — Registres
  getRegistres: (archiveId: string) => ipcRenderer.invoke('registres:list', archiveId),
  createRegistre: (archiveId: string, data: object) => ipcRenderer.invoke('registres:create', archiveId, data),
  getRegistre: (registreId: string) => ipcRenderer.invoke('registres:get', registreId),
  updateRegistre: (registreId: string, data: object) => ipcRenderer.invoke('registres:update', registreId, data),
  deleteRegistre: (registreId: string) => ipcRenderer.invoke('registres:delete', registreId),
  setActeRegistre: (acteId: string, registreId: string | null) => ipcRenderer.invoke('registres:setActe', acteId, registreId),
  applyRegistreDefaults: (registreId: string) => ipcRenderer.invoke('registres:applyDefaults', registreId),
  exportRegistrePdf: (registreId: string) => ipcRenderer.invoke('registres:exportPdf', registreId),

  // Export / Import
  exportArchive: (archiveId: string) => ipcRenderer.invoke('archive:export', archiveId),
  importArchive: (archiveId: string) => ipcRenderer.invoke('archive:import', archiveId),

  // Search
  search: (q: string, archiveId?: string) => ipcRenderer.invoke('search:query', q, archiveId),

  // HTR — transcription automatique
  htrStatus: () => ipcRenderer.invoke('htr:status'),
  htrTranscribe: (filePath: string) => ipcRenderer.invoke('htr:transcribe', filePath),
  htrSaveCorrection: (acteId: string, filePath: string, transcription: string) => ipcRenderer.invoke('htr:saveCorrection', acteId, filePath, transcription),
  htrTrain: () => ipcRenderer.invoke('htr:train'),
  htrTrainStatus: () => ipcRenderer.invoke('htr:trainStatus'),

  // Local file URL for images/PDFs
  fileUrl: (filePath: string) => `localfile:///${filePath.replace(/\\/g, '/')}`,
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
