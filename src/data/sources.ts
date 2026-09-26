import type { Source } from '../types'

/**
 * Shared discovery sources for European CS position-based PhDs.
 * Personal opportunities must NEVER live in this file.
 */
export const sources: Source[] = [
  // ---- Pan-European ----
  {
    id: 'euraxess',
    name: 'EURAXESS',
    url: 'https://euraxess.ec.europa.eu/jobs/search',
    countries: ['EU', 'Europe'],
    type: 'aggregator',
    howToSearch:
      'Filters: Job type → Researcher / First Stage Researcher (R1). Keywords: PhD, doctoral, computer science. Narrow by country. Register to get keyword email alerts.',
    csNotes:
      'Primary EU portal for funded research positions, incl. MSCA doctoral networks. Prefer ads that list salary/contract (true position-based posts).',
    searchUrlTemplate:
      'https://euraxess.ec.europa.eu/jobs/search?keywords={query}&position[]=position_r1',
  },
  {
    id: 'msca',
    name: 'MSCA Doctoral Networks',
    url: 'https://marie-sklodowska-curie-actions.ec.europa.eu/',
    countries: ['EU', 'Europe'],
    type: 'project',
    howToSearch:
      'Search "MSCA DN" + your topic, or EURAXESS for Doctoral Candidate in specific networks.',
    csNotes:
      'Network-wide calls with mobility rules. Deadlines are hard; eligibility (mobility) matters.',
  },
  {
    id: 'ellis-jobs',
    name: 'ELLIS Job Board',
    url: 'https://ellis.eu/jobs',
    countries: ['Europe'],
    type: 'aggregator',
    howToSearch:
      'Filter by PhD positions; browse newest first. Topics: ML, NLP, trustworthy AI.',
    csNotes:
      'Pan-European AI/ML network; top labs post PhD openings here year-round.',
  },
  {
    id: 'ellis-phd',
    name: 'ELLIS PhD Program',
    url: 'https://ellis.eu/phd-postdoc',
    countries: ['Europe'],
    type: 'project',
    howToSearch:
      'Central call opens ~October, closes ~mid-November. Pick primary + secondary advisors across countries.',
    csNotes:
      'Joint supervision across ELLIS units; one application reaches many AI/ML PIs.',
  },
  {
    id: 'informatics-europe',
    name: 'Informatics Europe Jobs',
    url: 'https://www.informatics-europe.org/jobs',
    countries: ['Europe'],
    type: 'aggregator',
    howToSearch:
      'Filter position type PhD. Register and subscribe to job alerts for your keywords.',
    csNotes: 'CS-only job platform of European computing departments; low noise.',
  },
  {
    id: 'academic-positions',
    name: 'Academic Positions',
    url: 'https://academicpositions.com/',
    countries: ['Europe'],
    type: 'aggregator',
    howToSearch:
      'Filter: PhD → Computer Science / Engineering. Add country filters for DE, NL, SE, CH, etc.',
    csNotes: 'Good coverage of Nordic and Western European university posts.',
    searchUrlTemplate:
      'https://academicpositions.com/find-jobs?q={query}&position_type[]=phd',
  },
  {
    id: 'scholarshipdb',
    name: 'ScholarshipDb',
    url: 'https://scholarshipdb.net/',
    countries: ['Europe'],
    type: 'aggregator',
    howToSearch: 'Search keyword + country; results link to official university ads.',
    csNotes:
      'Crawls university open-positions pages; useful to catch posts missed elsewhere. Verify on the original page.',
    searchUrlTemplate: 'https://scholarshipdb.net/scholarships?q={query}',
  },
  {
    id: 'nature-careers',
    name: 'Nature Careers',
    url: 'https://www.nature.com/naturecareers/',
    countries: ['Europe'],
    type: 'aggregator',
    howToSearch:
      'Search PhD + computer science / machine learning. Filter location Europe.',
    csNotes: 'Fewer pure CS posts than EURAXESS; useful for interdisciplinary ML/bioinformatics.',
    searchUrlTemplate:
      'https://www.nature.com/naturecareers/jobs?keywords={query}&job_type=1169',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Jobs',
    url: 'https://www.linkedin.com/jobs/',
    countries: ['Europe'],
    type: 'other',
    howToSearch:
      'Keywords: "PhD position" OR "Doctoral researcher" + Computer Science. Location: Europe.',
    csNotes: 'Noisy but catches lab posts that skip aggregators. Follow target PIs and labs.',
    searchUrlTemplate:
      'https://www.linkedin.com/jobs/search/?keywords={query}&location=Europe',
  },

  // ---- NL ----
  {
    id: 'academictransfer',
    name: 'AcademicTransfer (NL)',
    url: 'https://www.academictransfer.com/',
    countries: ['NL'],
    type: 'national',
    howToSearch:
      'Filter PhD → Computer Science / Artificial Intelligence / Electrical Engineering. Weekly sweep recommended.',
    csNotes:
      'National portal where all Dutch universities publish salaried PhD vacancies (TU Delft, UvA, TU/e, etc.).',
    searchUrlTemplate:
      'https://www.academictransfer.com/en/search/?q={query}&job_type=phd',
  },
  {
    id: 'tudelft',
    name: 'TU Delft Vacancies',
    url: 'https://www.tudelft.nl/over-tu-delft/werken-bij-tu-delft/vacatures',
    countries: ['NL'],
    type: 'university',
    howToSearch: 'Filter job type PhD; faculty EEMCS for CS.',
    csNotes: 'European SE hub (SERG group); also security and AI.',
  },
  {
    id: 'tue',
    name: 'TU Eindhoven (TU/e) Vacancies',
    url: 'https://jobs.tue.nl/en/vacancies',
    countries: ['NL'],
    type: 'university',
    howToSearch: 'Filter category PhD; department Mathematics & Computer Science.',
    csNotes: 'Formal verification, systems engineering, trustworthy AI.',
  },
  {
    id: 'uva',
    name: 'University of Amsterdam (UvA) Vacancies',
    url: 'https://www.uva.nl/en/about-the-uva/working-at-the-uva/vacancies',
    countries: ['NL'],
    type: 'university',
    howToSearch: 'Filter PhD positions; faculty of Science (IvI).',
    csNotes: 'NLP, computer vision, causal representation learning.',
  },
  {
    id: 'vu',
    name: 'VU Amsterdam Vacancies',
    url: 'https://workingat.vu.nl/vacancies',
    countries: ['NL'],
    type: 'university',
    howToSearch: 'Filter PhD; faculty of Science, Computer Science department.',
    csNotes: 'Empirical software engineering, AI engineering and testing.',
  },
  {
    id: 'utwente',
    name: 'University of Twente Careers',
    url: 'https://www.utwente.nl/en/organization/careers/',
    countries: ['NL'],
    type: 'university',
    howToSearch: 'Open vacancies → PhD; faculty EEMCS.',
    csNotes: 'Embedded systems, system evaluation, distributed software.',
  },

  // ---- SE ----
  {
    id: 'kth',
    name: 'KTH Vacancies',
    url: 'https://www.kth.se/en/om/work-at-kth/vacancies',
    countries: ['SE'],
    type: 'university',
    howToSearch:
      'Filter Doctoral students; school EECS. Keywords: software engineering, testing, NLP. Weekly sweep.',
    csNotes: 'Software analysis & testing (CASTOR), autonomous systems, NLP. Varbi/ReachMee-based.',
  },
  {
    id: 'chalmers',
    name: 'Chalmers Vacancies',
    url: 'https://www.chalmers.se/en/about-chalmers/work-with-us/vacancies/',
    countries: ['SE'],
    type: 'university',
    howToSearch: 'Filter PhD positions; department Computer Science and Engineering. Weekly sweep.',
    csNotes: 'Very large SE division, empirical evaluation, AI safety.',
  },
  {
    id: 'uppsala',
    name: 'Uppsala University Jobs',
    url: 'https://www.uu.se/en/about-uu/join-us/jobs/',
    countries: ['SE'],
    type: 'university',
    howToSearch: 'Filter PhD student positions; department of Information Technology.',
    csNotes: 'Formal systems, software testing, algorithmic security.',
  },
  {
    id: 'lund',
    name: 'Lund University Vacancies',
    url: 'https://www.lu.se/vacancies',
    countries: ['SE'],
    type: 'university',
    howToSearch: 'Filter Doctoral students; faculty LTH, Computer Science.',
    csNotes: 'Intelligent systems, software architecture, trustworthy ML.',
  },

  // ---- FI ----
  {
    id: 'aalto',
    name: 'Aalto University Open Positions',
    url: 'https://www.aalto.fi/en/careers-at-aalto/open-positions',
    countries: ['FI'],
    type: 'university',
    howToSearch: 'Filter Doctoral researcher; School of Science (CS department).',
    csNotes: 'Strong ML and SE; also joint calls via Finnish Doctoral Programme (FCAI).',
  },
  {
    id: 'helsinki',
    name: 'University of Helsinki Open Positions',
    url: 'https://www.helsinki.fi/en/about-us/careers/open-positions',
    countries: ['FI'],
    type: 'university',
    howToSearch: 'Filter Doctoral researcher; Faculty of Science, Computer Science.',
    csNotes: 'ML, NLP, empirical software engineering.',
  },

  // ---- DK ----
  {
    id: 'dtu',
    name: 'DTU Vacancies',
    url: 'https://www.dtu.dk/english/about/vacancies',
    countries: ['DK'],
    type: 'university',
    howToSearch: 'Filter PhD; department DTU Compute.',
    csNotes: 'Salaried 3-year PhD; formal methods, ML, cyber security.',
  },
  {
    id: 'ku',
    name: 'University of Copenhagen PhD Positions',
    url: 'https://employment.ku.dk/phd-positions/',
    countries: ['DK'],
    type: 'university',
    howToSearch: 'Filter faculty SCIENCE; department DIKU.',
    csNotes: 'NLP, programming languages, ML.',
  },

  // ---- NO ----
  {
    id: 'jobbnorge',
    name: 'Jobbnorge (research)',
    url: 'https://www.jobbnorge.no/en/available-jobs/research',
    countries: ['NO'],
    type: 'national',
    howToSearch: 'Search "PhD Research Fellow" + informatics; filter employer (NTNU, UiO, UiB).',
    csNotes: 'National portal for Norwegian academic jobs; PhDs are employment contracts.',
  },
  {
    id: 'ntnu',
    name: 'NTNU Vacancies',
    url: 'https://www.ntnu.edu/vacancies',
    countries: ['NO'],
    type: 'university',
    howToSearch: 'Listings redirect to Jobbnorge; filter Faculty of Information Technology (IE).',
    csNotes: 'Largest Norwegian tech university; SE, AI, security.',
  },
  {
    id: 'uio',
    name: 'University of Oslo Vacancies',
    url: 'https://www.uio.no/english/about/vacancies/',
    countries: ['NO'],
    type: 'university',
    howToSearch: 'Filter Doctoral research fellow; Department of Informatics.',
    csNotes: 'Programming languages, formal methods, ML.',
  },

  // ---- IS ----
  {
    id: 'reykjavik-university',
    name: 'Reykjavik University Jobs',
    url: 'https://jobs.50skills.com/ru/en',
    countries: ['IS'],
    type: 'university',
    howToSearch:
      'Browse all open positions or filter by Department of Computer Science; look for "PhD" in the title and check deadlines.',
    csNotes:
      'Official RU hiring platform; few openings and mixed with engineering/business. CS posts (security, ML) are labelled explicitly.',
  },

  // ---- DE ----
  {
    id: 'daad',
    name: 'DAAD PhD Germany',
    url: 'https://www.daad.de/en/study-and-research-in-germany/phd-studies-and-research/',
    countries: ['DE'],
    type: 'national',
    howToSearch:
      'Use DAAD database and university career pages. Also search "Promotionsstelle Informatik" on university sites.',
    csNotes:
      'German CS PhDs are often TV-L E13 positions posted on university Stellenausschreibungen, not only DAAD.',
  },
  {
    id: 'imprs-is',
    name: 'IMPRS-IS (Stuttgart/Tübingen)',
    url: 'https://imprs.is.mpg.de/application',
    countries: ['DE'],
    type: 'project',
    howToSearch:
      'Program application portal, not a job list. Annual call opens ~September, deadline November 15. Shortlist matching faculty before applying.',
    csNotes:
      'Max Planck + Univ. Stuttgart + Univ. Tübingen; AI, ML, vision, robotics. Employment contract; needs motivation letter + references; very competitive.',
  },
  {
    id: 'saarbruecken-sic',
    name: 'Saarbrücken Graduate School (SIC)',
    url: 'https://apply.cs.uni-saarland.de/',
    countries: ['DE'],
    type: 'project',
    howToSearch: 'Rolling/periodic application rounds; watch for autumn deadlines.',
    csNotes: 'Saarland Univ. + MPI-INF + MPI-SWS + CISPA; top for testing, security, systems.',
  },
  {
    id: 'mcml',
    name: 'MCML (Munich Center for ML)',
    url: 'https://mcml.ai/opportunities/for-phd-applicants/',
    countries: ['DE'],
    type: 'project',
    howToSearch: 'Joint LMU/TUM matchmaking call; check the page for current round dates.',
    csNotes: 'Munich ML cluster; one application reaches many LMU/TUM PIs.',
  },
  {
    id: 'tum',
    name: 'TU Munich (TUM) Vacancies',
    url: 'https://www.tum.de/en/about-tum/careers-and-jobs/vacancies',
    countries: ['DE'],
    type: 'university',
    howToSearch: 'Filter Doktorand/PhD; school CIT (Informatics).',
    csNotes: 'Software engineering, automated testing, embedded systems.',
  },
  {
    id: 'kit',
    name: 'KIT Jobs',
    url: 'https://jobs.kit.edu/',
    countries: ['DE'],
    type: 'university',
    howToSearch: 'Filter Doktorand/in; department Informatics.',
    csNotes: 'Formal engineering, system reliability, intelligent algorithms.',
  },
  {
    id: 'tu-darmstadt',
    name: 'TU Darmstadt Stellenangebote',
    url: 'https://www.tu-darmstadt.de/stellenangebote/',
    countries: ['DE'],
    type: 'university',
    howToSearch: 'Filter wissenschaftliche Mitarbeiter/in; department Informatik.',
    csNotes: 'Software analysis, trustworthy AI.',
  },
  {
    id: 'uni-stuttgart',
    name: 'University of Stuttgart Jobs',
    url: 'https://www.uni-stuttgart.de/en/university/jobs/',
    countries: ['DE'],
    type: 'university',
    howToSearch: 'Filter research assistant / PhD; faculty Computer Science.',
    csNotes: 'Software engineering and deep learning (e.g. Michael Pradel group).',
  },

  // ---- CH ----
  {
    id: 'ethz',
    name: 'ETH Zurich Jobs',
    url: 'https://jobs.ethz.ch/',
    countries: ['CH'],
    type: 'university',
    howToSearch: 'Filter category PhD; department D-INFK.',
    csNotes: 'Top systems testing (AST Lab), trustworthy AI (SRI Lab). Very competitive; tailor to PI.',
  },
  {
    id: 'epfl',
    name: 'EPFL Vacancies',
    url: 'https://www.epfl.ch/about/working/working-at-epfl/vacancies/',
    countries: ['CH'],
    type: 'university',
    howToSearch: 'Most CS PhDs go via EDIC doctoral school (Dec/Apr deadlines); lab posts listed here.',
    csNotes: 'Software reliability & testing, NLP and LLM evaluation.',
  },
  {
    id: 'uzh',
    name: 'University of Zurich Jobs',
    url: 'https://jobs.uzh.ch/',
    countries: ['CH'],
    type: 'university',
    howToSearch: 'Filter PhD; Department of Informatics (IfI).',
    csNotes: 'Empirical software engineering (SEAL group), intelligent systems security.',
  },

  // ---- LU ----
  {
    id: 'uni-lu',
    name: 'University of Luxembourg (SnT)',
    url: 'https://recruitment.uni.lu/',
    countries: ['LU'],
    type: 'university',
    howToSearch: 'Filter Doctoral researcher; unit SnT or FSTM.',
    csNotes: 'European software testing & verification hub (SVV group); many openings.',
  },

  // ---- AT ----
  {
    id: 'tuwien',
    name: 'TU Wien Jobs',
    url: 'https://www.tuwien.at/en/tu-wien/jobs-careers',
    countries: ['AT'],
    type: 'university',
    howToSearch: 'Filter university assistant / PhD; faculty of Informatics. Also check LogiCS doctoral college.',
    csNotes: 'Formal methods and software technology.',
  },
  {
    id: 'ista',
    name: 'ISTA Graduate School',
    url: 'https://phd.ista.ac.at/',
    countries: ['AT'],
    type: 'project',
    howToSearch: 'Annual central call; deadline early January. Rotations in first year.',
    csNotes: 'Fully funded interdisciplinary PhD; strong CS/ML groups.',
  },

  // ---- BE ----
  {
    id: 'kuleuven',
    name: 'KU Leuven PhD Jobs',
    url: 'https://www.kuleuven.be/personeel/jobsite/jobs/phd',
    countries: ['BE'],
    type: 'university',
    howToSearch: 'Filter Computer Science department.',
    csNotes: 'Software engineering, knowledge graphs, trustworthy AI.',
  },

  // ---- UK ----
  {
    id: 'findaphd',
    name: 'FindAPhD',
    url: 'https://www.findaphd.com/',
    countries: ['UK'],
    type: 'aggregator',
    howToSearch:
      'Search Computer Science / AI / Software Engineering. Use Europe or specific country filters. Sort by newest.',
    csNotes:
      'Strong for UK and Northern Europe. Check funding status on each listing (funded vs self-funded).',
    searchUrlTemplate:
      'https://www.findaphd.com/phds/?Keywords={query}&Show=Y',
  },
  {
    id: 'jobs-ac-uk',
    name: 'jobs.ac.uk',
    url: 'https://www.jobs.ac.uk/',
    countries: ['UK'],
    type: 'aggregator',
    howToSearch:
      'Academic / Research → PhD Studentship. Keywords: computer science, AI, software.',
    csNotes: 'Essential for UK studentships; many are funded positions with hard deadlines.',
    searchUrlTemplate:
      'https://www.jobs.ac.uk/search/?keywords={query}&job_type=1304',
  },

  // ---- FR ----
  {
    id: 'campus-france',
    name: 'Campus France / ABG',
    url: 'https://www.abg.asso.fr/en/',
    countries: ['FR'],
    type: 'national',
    howToSearch:
      'Search doctoral / PhD offers in informatique, IA, sciences du numérique.',
    csNotes: 'French CIFRE and lab-funded doctorates often appear on ABG and lab pages.',
  },
]
