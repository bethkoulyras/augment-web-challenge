export const categoryFields = ['cat_1', 'cat_2', 'cat_3'] as const
export const gradeFields = [
  'grade_01', 'grade_02', 'grade_03', 'grade_04', 'grade_05', 'grade_06',
  'grade_07', 'grade_08', 'grade_09', 'grade_10', 'grade_11',
] as const

export type AttributeField = typeof categoryFields[number] | typeof gradeFields[number]
export type BlockAttributes = Record<AttributeField, number | null>

export interface SourceBlock extends Block {
  attributes: BlockAttributes
}

export interface Block {
  IJK: number
  XC: number
  YC: number
  ZC: number
  Xinc: number
  Yinc: number
  Zinc: number
}
