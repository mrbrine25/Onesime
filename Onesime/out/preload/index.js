"use strict";
const electron = require("electron");
const api = {
  // Dialog
  selectFolder: () => electron.ipcRenderer.invoke("dialog:selectFolder"),
  // Archives
  getArchives: () => electron.ipcRenderer.invoke("archives:list"),
  createArchive: (data) => electron.ipcRenderer.invoke("archives:create", data),
  updateArchive: (id, data) => electron.ipcRenderer.invoke("archives:update", id, data),
  deleteArchive: (id) => electron.ipcRenderer.invoke("archives:delete", id),
  // Files
  browseArchive: (archiveId, path) => electron.ipcRenderer.invoke("files:browse", archiveId, path),
  browseArchiveAll: (archiveId, path) => electron.ipcRenderer.invoke("files:browseAll", archiveId, path),
  // Fiches
  getFiches: (archiveId) => electron.ipcRenderer.invoke("fiches:list", archiveId),
  createFiche: (archiveId, data) => electron.ipcRenderer.invoke("fiches:create", archiveId, data),
  getFiche: (ficheId) => electron.ipcRenderer.invoke("fiches:get", ficheId),
  updateFiche: (ficheId, data) => electron.ipcRenderer.invoke("fiches:update", ficheId, data),
  deleteFiche: (ficheId) => electron.ipcRenderer.invoke("fiches:delete", ficheId),
  addDocumentToFiche: (ficheId, docId) => electron.ipcRenderer.invoke("fiches:addDocument", ficheId, docId),
  removeDocumentFromFiche: (ficheId, docId) => electron.ipcRenderer.invoke("fiches:removeDocument", ficheId, docId),
  setFicheAvatar: (ficheId, zoneId) => electron.ipcRenderer.invoke("fiches:setAvatar", ficheId, zoneId),
  // Documents
  getDocuments: (archiveId) => electron.ipcRenderer.invoke("documents:list", archiveId),
  getRecentDocuments: (archiveId) => electron.ipcRenderer.invoke("documents:recentForHome", archiveId),
  createDocument: (archiveId, data) => electron.ipcRenderer.invoke("documents:create", archiveId, data),
  getDocument: (docId) => electron.ipcRenderer.invoke("documents:get", docId),
  updateDocument: (docId, data) => electron.ipcRenderer.invoke("documents:update", docId, data),
  deleteDocument: (docId) => electron.ipcRenderer.invoke("documents:delete", docId),
  linkDocuments: (docId, linkedId, type) => electron.ipcRenderer.invoke("documents:link", docId, linkedId, type),
  unlinkDocument: (docId) => electron.ipcRenderer.invoke("documents:unlink", docId),
  // Zones
  createZone: (docId, data) => electron.ipcRenderer.invoke("zones:create", docId, data),
  updateZone: (zoneId, data) => electron.ipcRenderer.invoke("zones:update", zoneId, data),
  deleteZone: (zoneId) => electron.ipcRenderer.invoke("zones:delete", zoneId),
  addPersonToZone: (zoneId, personId) => electron.ipcRenderer.invoke("zones:addPerson", zoneId, personId),
  removePersonFromZone: (zoneId, personId) => electron.ipcRenderer.invoke("zones:removePerson", zoneId, personId),
  listZoneLabels: (archiveId) => electron.ipcRenderer.invoke("zones:listLabels", archiveId),
  getZonesWithFace: (archiveId) => electron.ipcRenderer.invoke("zones:withFace", archiveId),
  getZonesAllLabeled: (archiveId) => electron.ipcRenderer.invoke("zones:allLabeled", archiveId),
  // Thumbnails (cached in main process, return data URL)
  getThumbnail: (filePath, maxPx) => electron.ipcRenderer.invoke("doc:thumbnail", filePath, maxPx),
  // Persons
  getPersons: (archiveId, q) => electron.ipcRenderer.invoke("persons:list", archiveId || "", q),
  getPerson: (personId) => electron.ipcRenderer.invoke("persons:get", personId),
  createPerson: (archiveId, data) => electron.ipcRenderer.invoke("persons:create", archiveId, data),
  updatePerson: (personId, data) => electron.ipcRenderer.invoke("persons:update", personId, data),
  deletePerson: (personId) => electron.ipcRenderer.invoke("persons:delete", personId),
  setPersonAvatar: (personId, zoneId) => electron.ipcRenderer.invoke("persons:setAvatar", personId, zoneId),
  // Tags
  getTags: () => electron.ipcRenderer.invoke("tags:list"),
  createTag: (data) => electron.ipcRenderer.invoke("tags:create", data),
  updateTag: (tagId, data) => electron.ipcRenderer.invoke("tags:update", tagId, data),
  deleteTag: (tagId) => electron.ipcRenderer.invoke("tags:delete", tagId),
  getTagsForDocument: (docId) => electron.ipcRenderer.invoke("tags:forDocument", docId),
  addTagToDocument: (docId, tagId) => electron.ipcRenderer.invoke("tags:addToDocument", docId, tagId),
  removeTagFromDocument: (docId, tagId) => electron.ipcRenderer.invoke("tags:removeFromDocument", docId, tagId),
  getTagsForFiche: (ficheId) => electron.ipcRenderer.invoke("tags:forFiche", ficheId),
  addTagToFiche: (ficheId, tagId) => electron.ipcRenderer.invoke("tags:addToFiche", ficheId, tagId),
  removeTagFromFiche: (ficheId, tagId) => electron.ipcRenderer.invoke("tags:removeFromFiche", ficheId, tagId),
  getTagCounts: () => electron.ipcRenderer.invoke("tags:counts"),
  getDocumentsForTag: (tagId) => electron.ipcRenderer.invoke("tags:documents", tagId),
  // Albums
  getAlbums: (archiveId) => electron.ipcRenderer.invoke("albums:list", archiveId),
  createAlbum: (archiveId, data) => electron.ipcRenderer.invoke("albums:create", archiveId, data),
  getAlbum: (albumId) => electron.ipcRenderer.invoke("albums:get", albumId),
  updateAlbum: (albumId, data) => electron.ipcRenderer.invoke("albums:update", albumId, data),
  deleteAlbum: (albumId) => electron.ipcRenderer.invoke("albums:delete", albumId),
  addDocumentToAlbum: (albumId, docId) => electron.ipcRenderer.invoke("albums:addDocument", albumId, docId),
  addDocumentsToAlbum: (albumId, docIds) => electron.ipcRenderer.invoke("albums:addDocuments", albumId, docIds),
  removeDocumentFromAlbum: (albumId, docId) => electron.ipcRenderer.invoke("albums:removeDocument", albumId, docId),
  updateAlbumDocEntry: (albumId, docId, data) => electron.ipcRenderer.invoke("albums:updateDocEntry", albumId, docId, data),
  reorderAlbum: (albumId, docIds) => electron.ipcRenderer.invoke("albums:reorder", albumId, docIds),
  // Merge
  mergePersons: (sourceId, targetId) => electron.ipcRenderer.invoke("persons:merge", sourceId, targetId),
  mergeFiches: (sourceId, targetId) => electron.ipcRenderer.invoke("fiches:merge", sourceId, targetId),
  // Archive notes / stats / duplicates / backup
  getArchiveNotes: (archiveId) => electron.ipcRenderer.invoke("archive:notes:get", archiveId),
  setArchiveNotes: (archiveId, notes) => electron.ipcRenderer.invoke("archive:notes:set", archiveId, notes),
  getArchiveStats: (archiveId) => electron.ipcRenderer.invoke("archive:stats", archiveId),
  getArchiveDuplicates: (archiveId) => electron.ipcRenderer.invoke("archive:duplicates", archiveId),
  backupArchive: () => electron.ipcRenderer.invoke("archive:backup"),
  // Archives module — Actes
  getActes: (archiveId, filters) => electron.ipcRenderer.invoke("actes:list", archiveId, filters),
  getActe: (acteId) => electron.ipcRenderer.invoke("actes:get", acteId),
  createActe: (archiveId, data) => electron.ipcRenderer.invoke("actes:create", archiveId, data),
  updateActe: (acteId, data) => electron.ipcRenderer.invoke("actes:update", acteId, data),
  deleteActe: (acteId) => electron.ipcRenderer.invoke("actes:delete", acteId),
  importActeFiles: (archiveId) => electron.ipcRenderer.invoke("actes:importFiles", archiveId),
  setActeParties: (acteId, parties) => electron.ipcRenderer.invoke("actes:parties:set", acteId, parties),
  getActeStats: (archiveId) => electron.ipcRenderer.invoke("actes:stats", archiveId),
  // Archives module — Registres
  getRegistres: (archiveId) => electron.ipcRenderer.invoke("registres:list", archiveId),
  createRegistre: (archiveId, data) => electron.ipcRenderer.invoke("registres:create", archiveId, data),
  getRegistre: (registreId) => electron.ipcRenderer.invoke("registres:get", registreId),
  updateRegistre: (registreId, data) => electron.ipcRenderer.invoke("registres:update", registreId, data),
  deleteRegistre: (registreId) => electron.ipcRenderer.invoke("registres:delete", registreId),
  setActeRegistre: (acteId, registreId) => electron.ipcRenderer.invoke("registres:setActe", acteId, registreId),
  applyRegistreDefaults: (registreId) => electron.ipcRenderer.invoke("registres:applyDefaults", registreId),
  exportRegistrePdf: (registreId) => electron.ipcRenderer.invoke("registres:exportPdf", registreId),
  // Export / Import
  exportArchive: (archiveId) => electron.ipcRenderer.invoke("archive:export", archiveId),
  importArchive: (archiveId) => electron.ipcRenderer.invoke("archive:import", archiveId),
  // Search
  search: (q, archiveId) => electron.ipcRenderer.invoke("search:query", q, archiveId),
  // HTR — transcription automatique
  htrStatus: () => electron.ipcRenderer.invoke("htr:status"),
  htrTranscribe: (filePath) => electron.ipcRenderer.invoke("htr:transcribe", filePath),
  htrSaveCorrection: (acteId, filePath, transcription) => electron.ipcRenderer.invoke("htr:saveCorrection", acteId, filePath, transcription),
  htrTrain: () => electron.ipcRenderer.invoke("htr:train"),
  htrTrainStatus: () => electron.ipcRenderer.invoke("htr:trainStatus"),
  // Local file URL for images/PDFs
  fileUrl: (filePath) => `localfile:///${filePath.replace(/\\/g, "/")}`
};
electron.contextBridge.exposeInMainWorld("api", api);
