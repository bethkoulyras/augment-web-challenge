export interface SurveyPoint {
  X: number
  Y: number
  Z: number
}

export interface BlastHole {
  BHID: number
  XCOLLAR: number
  YCOLLAR: number
  ZCOLLAR: number
  DEPTH: number
  Angle: number
  Bearing: number
  Diameter: number
  KG: number
  TIMING: number
  Subdrill: number | null
  STEM: number | null
  HoleType: number
  MatType: number
}

export interface SceneMetadata {
  boundaries: { before: SurveyPoint[][]; after: SurveyPoint[][] }
  holes: BlastHole[]
}

export interface SceneLayers extends SceneMetadata {
  surfaces: { before: Float32Array; after: Float32Array }
}

export interface LayerVisibility {
  blocks: boolean
  context: boolean
  surface: boolean
  boundary: boolean
  holes: boolean
}
