import type { Skill } from '../types'

/** Shareable search recipes. Edit/add freely; no personal data. */
export const skills: Skill[] = [
  {
    id: 'cs-phd-europe-broad',
    title: 'CS PhD · Europe broad',
    description:
      'Wide net across computer science doctoral positions in Europe. Start here for weekly sweeps.',
    keywords: [
      'PhD',
      'doctoral',
      'computer science',
      'informatics',
      'software engineering',
    ],
    exclude: ['postdoc', 'professor', 'internship', 'self-funded only'],
    countries: ['Europe'],
    sources: [
      'euraxess',
      'informatics-europe',
      'findaphd',
      'academic-positions',
      'jobs-ac-uk',
      'academictransfer',
      'linkedin',
    ],
    tips: [
      'Prefer ads that mention contract, salary grade (e.g. TV-L E13), or employment.',
      'Skip vague “express interest” pages without a funded seat.',
      'Scan newest first; many EU posts close in 2–4 weeks.',
    ],
  },
  {
    id: 'ml-systems',
    title: 'ML / Systems',
    description:
      'Machine learning, systems for ML, distributed systems, and related CS systems research.',
    keywords: [
      'PhD',
      'machine learning',
      'deep learning',
      'systems',
      'distributed systems',
      'MLSys',
    ],
    exclude: ['pure biology', 'clinical only', 'undergraduate'],
    countries: ['Europe'],
    sources: [
      'euraxess',
      'ellis-jobs',
      'findaphd',
      'academic-positions',
      'academictransfer',
      'nature-careers',
      'msca',
      'linkedin',
    ],
    tips: [
      'Interdisciplinary Nature Careers hits often need careful fit checks.',
      'For DE/CH, also open university Stellenausschreibungen after the aggregators.',
    ],
  },
  {
    id: 'hci-interaction',
    title: 'HCI / Interaction',
    description:
      'Human–computer interaction, UX research, CSCW, and interactive systems PhD posts.',
    keywords: [
      'PhD',
      'HCI',
      'human-computer interaction',
      'interaction design',
      'CSCW',
      'user experience',
    ],
    exclude: ['pure hardware sales', 'non-research UX designer'],
    countries: ['Europe'],
    sources: [
      'euraxess',
      'findaphd',
      'academic-positions',
      'jobs-ac-uk',
      'academictransfer',
      'jobbnorge',
      'kth',
      'chalmers',
      'aalto',
    ],
    tips: [
      'HCI posts may sit under Design, Media, or Psychology faculties—widen keywords.',
      'Nordic portals often list HCI under Information Technology.',
    ],
  },
  {
    id: 'se-ai-testing-europe',
    title: 'SE / Testing / LLM · Europe',
    description:
      'Software engineering, software testing and LLM/NLP PhD posts at European salaried-PhD hubs.',
    keywords: [
      'PhD',
      'software engineering',
      'software testing',
      'large language model',
      'NLP',
    ],
    exclude: ['postdoc', 'professor', 'internship'],
    countries: ['Europe', 'NL', 'SE', 'DE', 'CH', 'LU'],
    sources: [
      'academictransfer',
      'kth',
      'chalmers',
      'ellis-jobs',
      'euraxess',
      'informatics-europe',
      'imprs-is',
      'saarbruecken-sic',
      'ethz',
      'uni-lu',
    ],
    tips: [
      'Weekly (~30 min, e.g. Monday): AcademicTransfer, KTH and Chalmers filtered by Software Engineering / Testing / LLM / NLP.',
      'Oct–Nov: central calls for IMPRS-IS (mid-Nov deadline), ELLIS PhD Program and Saarbrücken SIC; shortlist advisors early.',
      'Register on EURAXESS and Informatics Europe to get keyword email alerts.',
    ],
  },
]
