// Change this one value to "v2" to tag all new submissions with a new survey version.
export const SURVEY_VERSION = 'v2'

export const CALLBACK_URL = 'https://terac.com/api/external/callback'

export type Choice = { id: string; label: string; options: string[]; other?: string }

export const Q1: Choice = {
  id: 'q1',
  label: 'Which best describes you?',
  options: [
    'I have a cat now',
    'I’ve had cats before',
    'I’d love a cat but can’t have one right now',
    'I like cats but don’t want one',
    'I’m not really a cat person',
  ],
}
export const Q1_CONDITIONAL = 'I’d love a cat but can’t have one right now'

export const Q2: Choice = {
  id: 'q2',
  label: 'What’s stopping you from having a cat right now?',
  options: ['My lease doesn’t allow pets', 'Allergies in my household', 'Too busy or travel too much', 'Cost', 'Other'],
  other: 'Other',
}
export const Q3: Choice = {
  id: 'q3',
  label: 'Have you ever been to a cat cafe?',
  options: ['Yes, more than once', 'Yes, once', 'No, but I’ve wanted to', 'No, and I’m not interested'],
}
export const Q4: Choice = {
  id: 'q4',
  label: 'Before today, had you ever thought about paying to spend time with a friendly cat or dog?',
  options: ['Yes, and I’ve done it', 'Yes, but I never did', 'No, but it sounds appealing', 'No'],
}
export const Q6: Choice = {
  id: 'q6',
  label:
    'Imagine a host 15 minutes from you offers a 1-hour visit with their cat for $12. Based on what you saw, what would you do?',
  options: ['Book it', 'Message the host first', 'I’d need more information first', 'I wouldn’t book this'],
}
export const Q7: Choice = {
  id: 'q7',
  label: 'What would you need to see before booking? (select all that apply)',
  options: [
    'The host’s ID is verified',
    'Reviews from other guests',
    'A video call first',
    'Meeting in a public place first',
    'Knowing a friend has used it',
    'Nothing would make me comfortable',
    'Other',
  ],
  other: 'Other',
}
export const Q8: Choice = {
  id: 'q8',
  label: 'Compared to booking a stay on Airbnb, how does this feel?',
  options: ['Much less safe', 'A bit less safe', 'About the same', 'Safer'],
}
export const Q9: Choice = {
  id: 'q9',
  label:
    'Now imagine you have a calm, friendly cat. A verified guest asks to visit your home for an hour. What would you do?',
  options: [
    'Accept',
    'Accept after a video call',
    'Only after meeting them in public first',
    'I wouldn’t accept',
    'I’d never do this',
  ],
}

export const Q5_LABEL = 'In one sentence, what does this site do?'
export const Q10_LABEL = 'What’s the one thing that would most change your answers?'
export const Q11_LABEL = 'What’s the most you’d pay for one hour with a cat? (USD)'

export const SINGLE_CHOICES = [Q1, Q2, Q3, Q4, Q6, Q8, Q9]
export const MULTI_CHOICES = [Q7]

export type Answers = {
  q1: string
  q2?: string
  q2_other?: string
  q3: string
  q4: string
  q5: string
  q6: string
  q7: string[]
  q7_other?: string
  q8: string
  q9: string
  q10: string
  q11: number
}
