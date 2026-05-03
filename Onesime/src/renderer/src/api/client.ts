// All calls go through Electron IPC via window.api (contextBridge)
const w = window as Window & { api: typeof window.api }

export const selectFolder = (): Promise<string | null> => w.api.selectFolder()
export const fileUrl = (path: string): string => w.api.fileUrl(path)

// Archives
export const getArchives = () => w.api.getArchives()
export const createArchive = (data: object) => w.api.createArchive(data)
export const updateArchive = (id: string, data: object) => w.api.updateArchive(id, data)
export const deleteArchive = (id: string) => w.api.deleteArchive(id)
export const browseArchive = (archiveId: string, path = '') => w.api.browseArchive(archiveId, path)
export const browseArchiveAll = (archiveId: string, path = '') => w.api.browseArchiveAll(archiveId, path)

// Fiches
export const getFiches = (archiveId: string) => w.api.getFiches(archiveId)
export const createFiche = (archiveId: string, data: object) => w.api.createFiche(archiveId, data)
export const getFiche = (ficheId: string) => w.api.getFiche(ficheId)
export const updateFiche = (ficheId: string, data: object) => w.api.updateFiche(ficheId, data)
export const deleteFiche = (ficheId: string) => w.api.deleteFiche(ficheId)
export const addDocumentToFiche = (ficheId: string, docId: string) => w.api.addDocumentToFiche(ficheId, docId)
export const removeDocumentFromFiche = (ficheId: string, docId: string) => w.api.removeDocumentFromFiche(ficheId, docId)
export const setFicheAvatar = (ficheId: string, zoneId: string | null) => w.api.setFicheAvatar(ficheId, zoneId)

// Documents
export const getDocuments = (archiveId: string) => w.api.getDocuments(archiveId)
export const getRecentDocuments = (archiveId: string) => w.api.getRecentDocuments(archiveId)
export const createDocument = (archiveId: string, data: object) => w.api.createDocument(archiveId, data)
export const getDocument = (docId: string) => w.api.getDocument(docId)
export const updateDocument = (docId: string, data: object) => w.api.updateDocument(docId, data)
export const deleteDocument = (docId: string) => w.api.deleteDocument(docId)
export const linkDocuments = (docId: string, linkedId: string, type: string) => w.api.linkDocuments(docId, linkedId, type)
export const unlinkDocument = (docId: string) => w.api.unlinkDocument(docId)

// Zones
export const createZone = (docId: string, data: object) => w.api.createZone(docId, data)
export const updateZone = (zoneId: string, data: object) => w.api.updateZone(zoneId, data)
export const deleteZone = (zoneId: string) => w.api.deleteZone(zoneId)
export const addPersonToZone = (zoneId: string, personId: string) => w.api.addPersonToZone(zoneId, personId)
export const removePersonFromZone = (zoneId: string, personId: string) => w.api.removePersonFromZone(zoneId, personId)
export const listZoneLabels = (archiveId: string) => w.api.listZoneLabels(archiveId)
export const getZonesWithFace = (archiveId: string) => w.api.getZonesWithFace(archiveId)
export const getZonesAllLabeled = (archiveId: string) => w.api.getZonesAllLabeled(archiveId)

// Persons
export const getPersons = (archiveId?: string, q?: string) => w.api.getPersons(archiveId, q)
export const getThumbnail = (filePath: string, maxPx: number): Promise<string> => w.api.getThumbnail(filePath, maxPx)
export const getPerson = (personId: string) => w.api.getPerson(personId)
export const createPerson = (archiveId: string, data: object) => w.api.createPerson(archiveId, data)
export const updatePerson = (personId: string, data: object) => w.api.updatePerson(personId, data)
export const deletePerson = (personId: string) => w.api.deletePerson(personId)
export const setPersonAvatar = (personId: string, zoneId: string | null) => w.api.setPersonAvatar(personId, zoneId)

// Tags
export const getTags = () => w.api.getTags()
export const createTag = (data: object) => w.api.createTag(data)
export const updateTag = (tagId: string, data: object) => w.api.updateTag(tagId, data)
export const deleteTag = (tagId: string) => w.api.deleteTag(tagId)
export const getTagsForDocument = (docId: string) => w.api.getTagsForDocument(docId)
export const addTagToDocument = (docId: string, tagId: string) => w.api.addTagToDocument(docId, tagId)
export const removeTagFromDocument = (docId: string, tagId: string) => w.api.removeTagFromDocument(docId, tagId)
export const getTagsForFiche = (ficheId: string) => w.api.getTagsForFiche(ficheId)
export const addTagToFiche = (ficheId: string, tagId: string) => w.api.addTagToFiche(ficheId, tagId)
export const removeTagFromFiche = (ficheId: string, tagId: string) => w.api.removeTagFromFiche(ficheId, tagId)
export const getTagCounts = (): Promise<Record<string, number>> => w.api.getTagCounts()
export const getDocumentsForTag = (tagId: string) => w.api.getDocumentsForTag(tagId)

// Albums
export const getAlbums = (archiveId: string) => w.api.getAlbums(archiveId)
export const createAlbum = (archiveId: string, data: object) => w.api.createAlbum(archiveId, data)
export const getAlbum = (albumId: string) => w.api.getAlbum(albumId)
export const updateAlbum = (albumId: string, data: object) => w.api.updateAlbum(albumId, data)
export const deleteAlbum = (albumId: string) => w.api.deleteAlbum(albumId)
export const addDocumentToAlbum = (albumId: string, docId: string) => w.api.addDocumentToAlbum(albumId, docId)
export const addDocumentsToAlbum = (albumId: string, docIds: string[]) => w.api.addDocumentsToAlbum(albumId, docIds)
export const removeDocumentFromAlbum = (albumId: string, docId: string) => w.api.removeDocumentFromAlbum(albumId, docId)
export const updateAlbumDocEntry = (albumId: string, docId: string, data: object) => w.api.updateAlbumDocEntry(albumId, docId, data)
export const reorderAlbum = (albumId: string, docIds: string[]) => w.api.reorderAlbum(albumId, docIds)

// Merge
export const mergePersons = (sourceId: string, targetId: string) => w.api.mergePersons(sourceId, targetId)
export const mergeFiches = (sourceId: string, targetId: string) => w.api.mergeFiches(sourceId, targetId)

// Archive notes / stats / duplicates / backup
export const getArchiveNotes = (archiveId: string): Promise<string> => w.api.getArchiveNotes(archiveId)
export const setArchiveNotes = (archiveId: string, notes: string) => w.api.setArchiveNotes(archiveId, notes)
export const getArchiveStats = (archiveId: string) => w.api.getArchiveStats(archiveId)
export const getArchiveDuplicates = (archiveId: string) => w.api.getArchiveDuplicates(archiveId)
export const backupArchive = (): Promise<{ ok: boolean; path?: string; count?: number }> => w.api.backupArchive()

// Export / Import
export const exportArchive = (archiveId: string): Promise<{ ok: boolean; counts?: Record<string, number> }> => w.api.exportArchive(archiveId)
export const importArchive = (archiveId: string): Promise<{ ok: boolean; counts?: Record<string, number> }> => w.api.importArchive(archiveId)

// Search
export const search = (q: string, archiveId?: string) => w.api.search(q, archiveId)

// HTR — transcription automatique
export const htrStatus = (): Promise<{ ok: boolean; model_ready: boolean; model_loading: boolean; model_error?: string; device?: string; gt_count?: number; has_custom_model?: boolean }> => w.api.htrStatus()
export const htrTranscribe = (filePath: string): Promise<{ ok: boolean; transcription?: string; line_count?: number; warning?: string; error?: string }> => w.api.htrTranscribe(filePath)
export const htrSaveCorrection = (acteId: string, filePath: string, transcription: string): Promise<{ ok: boolean; count?: number; error?: string }> => w.api.htrSaveCorrection(acteId, filePath, transcription)
export const htrTrain = (): Promise<{ ok: boolean; pid?: number; error?: string }> => w.api.htrTrain()
export const htrTrainStatus = (): Promise<{ running: boolean; status: string; last_log?: string; returncode?: number }> => w.api.htrTrainStatus()

// Archives module — Actes
export const getActes = (archiveId: string, filters?: object) => w.api.getActes(archiveId, filters)
export const getActe = (acteId: string) => w.api.getActe(acteId)
export const createActe = (archiveId: string, data: object) => w.api.createActe(archiveId, data)
export const updateActe = (acteId: string, data: object) => w.api.updateActe(acteId, data)
export const deleteActe = (acteId: string) => w.api.deleteActe(acteId)
export const importActeFiles = (archiveId: string) => w.api.importActeFiles(archiveId)
export const setActeParties = (acteId: string, parties: object[]) => w.api.setActeParties(acteId, parties)
export const getActeStats = (archiveId: string) => w.api.getActeStats(archiveId)
// Archives module — Registres
export const getRegistres = (archiveId: string) => w.api.getRegistres(archiveId)
export const createRegistre = (archiveId: string, data: object) => w.api.createRegistre(archiveId, data)
export const getRegistre = (registreId: string) => w.api.getRegistre(registreId)
export const updateRegistre = (registreId: string, data: object) => w.api.updateRegistre(registreId, data)
export const deleteRegistre = (registreId: string) => w.api.deleteRegistre(registreId)
export const setActeRegistre = (acteId: string, registreId: string | null) => w.api.setActeRegistre(acteId, registreId)
export const applyRegistreDefaults = (registreId: string) => w.api.applyRegistreDefaults(registreId)
export const exportRegistrePdf = (registreId: string): Promise<{ ok: boolean; path?: string; error?: string }> => w.api.exportRegistrePdf(registreId)
