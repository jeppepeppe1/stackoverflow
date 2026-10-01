export type Palette = {
  /** All six swatch colors, in display order. */
  swatches: [string, string, string, string, string, string]
  /** Face colors used by the 3D materials. */
  top: string
  front: string
  side: string
}

export const PALETTES: Palette[] = [
  {
    swatches: ['#F26B2A', '#5B74E8', '#F5C842', '#8DB045', '#E8A5F2', '#9C9CF5'],
    top: '#F5C842',
    front: '#5B74E8',
    side: '#E8A5F2',
  },
  {
    swatches: ['#9C9CF5', '#F26B2A', '#8DB045', '#5B74E8', '#E8A5F2', '#A89A88'],
    top: '#9C9CF5',
    front: '#F26B2A',
    side: '#8DB045',
  },
  {
    swatches: ['#A89A88', '#8DB045', '#F5C842', '#F26B2A', '#E8A5F2', '#9C9CF5'],
    top: '#A89A88',
    front: '#8DB045',
    side: '#F26B2A',
  },
  {
    swatches: ['#F5C842', '#5B74E8', '#F26B2A', '#9C9CF5', '#C8CCE8', '#8DB045'],
    top: '#C8CCE8',
    front: '#5B74E8',
    side: '#F26B2A',
  },
]
