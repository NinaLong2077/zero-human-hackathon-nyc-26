export type Listing = {
  id: string
  name: string
  breed: string
  age: string
  city: string
  rate: number // USD per hour
  minHours: number
  maxHours: number
  bio: string
  traits: string[]
  hue: number
  image?: string
  images?: string[]
  owner: string
  sample?: boolean
  ownerId?: string
}

export const SAMPLES: Listing[] = [
  {
    id: 's1',
    image: '/cats/mango.png',
    name: 'Mango',
    breed: 'Orange tabby',
    age: '3 years',
    city: 'Park Slope, Brooklyn',
    rate: 12,
    minHours: 1,
    maxHours: 4,
    bio: 'Professional lap warmer. Will follow you around the apartment and supervise whatever you are doing.',
    traits: ['Lap cat', 'Chatty', 'Good with kids'],
    hue: 28,
    owner: 'Priya',
    sample: true,
  },
  {
    id: 's2',
    image: '/cats/biscuit.png',
    name: 'Biscuit',
    breed: 'Maine Coon',
    age: '5 years',
    city: 'Hyde Park, Austin',
    rate: 18,
    minHours: 2,
    maxHours: 6,
    bio: 'Enormous, fluffy and calm. Loves being brushed and will happily nap beside you while you work.',
    traits: ['Gentle', 'Loves brushing', 'Quiet'],
    hue: 200,
    owner: 'Dan',
    sample: true,
  },
  {
    id: 's3',
    image: '/cats/noodle.png',
    name: 'Noodle',
    breed: 'Siamese mix',
    age: '1 year',
    city: 'Logan Square, Chicago',
    rate: 15,
    minHours: 1,
    maxHours: 3,
    bio: 'Playful and curious. Bring a feather wand and be ready to run laps around the living room.',
    traits: ['Playful', 'Energetic', 'Loves toys'],
    hue: 340,
    owner: 'Marcus',
    sample: true,
  },
  {
    id: 's4',
    image: '/cats/professor-whiskers.png',
    name: 'Professor Whiskers',
    breed: 'Gray shorthair',
    age: '9 years',
    city: 'Alberta Arts, Portland',
    rate: 10,
    minHours: 1,
    maxHours: 5,
    bio: 'A retired senior who wants slow afternoons, soft blankets and one good chin scratch per hour.',
    traits: ['Senior', 'Mellow', 'Cuddly'],
    hue: 150,
    owner: 'Elena',
    sample: true,
  },
]

