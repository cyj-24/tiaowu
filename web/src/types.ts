export interface PoseKeypoint {
  x: number
  y: number
  z: number
  visibility: number
}

export interface PoseData {
  keypoints: PoseKeypoint[]
  bbox: [number, number, number, number]
}

export interface Person {
  id: number
  bbox: [number, number, number, number]
  confidence: number
}

export interface AnalysisResult {
  myPose: PoseData
  masterPose: PoseData
  myPersons: Person[]
  masterPersons: Person[]
  angleDiffs: Record<string, number>
  suggestions: string
  similarity: number
}

export interface UploadState {
  myImage: string | null
  masterImage: string | null
  myPersons: Person[]
  masterPersons: Person[]
  selectedMyPerson: number | null
  selectedMasterPerson: number | null
  isAnalyzing: boolean
}
