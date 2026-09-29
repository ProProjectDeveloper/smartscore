/**
 * Curated skill dictionary. Each skill has a canonical id, a display label,
 * a category, and the lowercase phrases ("aliases") that count as a mention.
 *
 * Aliases are matched against normalized text (see `normalizeText`), so
 * punctuation such as hyphens and slashes has already become spaces.
 * Ambiguous single-letter / common-word names (C, R, Go, REST) are only
 * matched through unambiguous phrases to avoid false positives.
 */
export type SkillCategory =
  | 'Languages'
  | 'Frontend'
  | 'Backend'
  | 'Data & ML'
  | 'Databases'
  | 'Cloud & DevOps'
  | 'Testing & Quality'
  | 'Practices'
  | 'Soft skills';

export interface Skill {
  id: string;
  label: string;
  category: SkillCategory;
  aliases: string[];
}

const s = (
  id: string,
  label: string,
  category: SkillCategory,
  aliases: string[] = [],
  matchLabel = true,
): Skill => ({
  id,
  label,
  category,
  aliases: Array.from(new Set([...(matchLabel ? [label.toLowerCase()] : []), ...aliases])),
});

export const SKILLS: Skill[] = [
  // Languages
  s('javascript', 'JavaScript', 'Languages', ['js', 'es6', 'ecmascript']),
  s('typescript', 'TypeScript', 'Languages', ['ts']),
  s('python', 'Python', 'Languages', ['python3']),
  s('java', 'Java', 'Languages', ['java 8', 'java 11', 'java 17']),
  s('csharp', 'C#', 'Languages', ['c sharp', 'csharp']),
  s('cpp', 'C++', 'Languages', ['cpp', 'c plus plus']),
  s('c', 'C', 'Languages', ['c programming', 'c language', 'embedded c', 'ansi c'], false),
  s('go', 'Go', 'Languages', ['golang', 'go language', 'go programming'], false),
  s('rust', 'Rust', 'Languages'),
  s('ruby', 'Ruby', 'Languages'),
  s('php', 'PHP', 'Languages'),
  s('kotlin', 'Kotlin', 'Languages'),
  s('swift', 'Swift', 'Languages'),
  s('scala', 'Scala', 'Languages'),
  s('r', 'R', 'Languages', ['r programming', 'r language', 'rstudio'], false),
  s('sql', 'SQL', 'Languages', ['t sql', 'tsql', 'pl sql', 'plsql']),
  s('bash', 'Bash', 'Languages', ['shell scripting', 'shell script', 'bash scripting']),

  // Frontend
  s('react', 'React', 'Frontend', ['react.js', 'reactjs', 'react js']),
  s('angular', 'Angular', 'Frontend', ['angularjs', 'angular.js']),
  s('vue', 'Vue', 'Frontend', ['vue.js', 'vuejs', 'vue js']),
  s('svelte', 'Svelte', 'Frontend', ['sveltekit']),
  s('nextjs', 'Next.js', 'Frontend', ['nextjs', 'next js']),
  s('redux', 'Redux', 'Frontend', ['redux toolkit']),
  s('html', 'HTML', 'Frontend', ['html5']),
  s('css', 'CSS', 'Frontend', ['css3', 'scss', 'sass']),
  s('tailwind', 'Tailwind CSS', 'Frontend', ['tailwind', 'tailwindcss']),
  s('accessibility', 'Accessibility', 'Frontend', ['a11y', 'wcag']),
  s('responsive', 'Responsive design', 'Frontend', ['responsive web design', 'mobile first']),

  // Backend
  s('nodejs', 'Node.js', 'Backend', ['node', 'nodejs', 'node js']),
  s('express', 'Express', 'Backend', ['express.js', 'expressjs', 'express js']),
  s('django', 'Django', 'Backend'),
  s('flask', 'Flask', 'Backend'),
  s('fastapi', 'FastAPI', 'Backend'),
  s('spring', 'Spring Boot', 'Backend', ['spring framework', 'springboot']),
  s('dotnet', '.NET', 'Backend', ['.net core', 'asp.net', 'dotnet']),
  s('rails', 'Ruby on Rails', 'Backend', ['rails', 'ror']),
  s('rest', 'REST APIs', 'Backend', ['rest api', 'restful', 'restful apis', 'rest apis', 'restful api']),
  s('graphql', 'GraphQL', 'Backend'),
  s('grpc', 'gRPC', 'Backend'),
  s('microservices', 'Microservices', 'Backend', ['microservice', 'micro services', 'service oriented architecture']),
  s('kafka', 'Kafka', 'Backend', ['apache kafka']),
  s('rabbitmq', 'RabbitMQ', 'Backend'),

  // Data & ML
  s('ml', 'Machine learning', 'Data & ML', ['ml', 'machine learning models']),
  s('dl', 'Deep learning', 'Data & ML', ['neural networks', 'neural network']),
  s('nlp', 'NLP', 'Data & ML', ['natural language processing']),
  s('pandas', 'pandas', 'Data & ML'),
  s('numpy', 'NumPy', 'Data & ML'),
  s('sklearn', 'scikit-learn', 'Data & ML', ['scikit learn', 'sklearn']),
  s('tensorflow', 'TensorFlow', 'Data & ML'),
  s('pytorch', 'PyTorch', 'Data & ML'),
  s('spark', 'Spark', 'Data & ML', ['apache spark', 'pyspark']),
  s('airflow', 'Airflow', 'Data & ML', ['apache airflow']),
  s('etl', 'ETL', 'Data & ML', ['elt', 'data pipelines', 'data pipeline']),
  s('statistics', 'Statistics', 'Data & ML', ['statistical analysis', 'statistical modeling']),
  s('dataviz', 'Data visualization', 'Data & ML', ['data visualisation', 'dashboards', 'tableau', 'power bi', 'looker']),
  s('excel', 'Excel', 'Data & ML', ['spreadsheets', 'pivot tables']),

  // Databases
  s('postgresql', 'PostgreSQL', 'Databases', ['postgres']),
  s('mysql', 'MySQL', 'Databases', ['mariadb']),
  s('mongodb', 'MongoDB', 'Databases', ['mongo']),
  s('redis', 'Redis', 'Databases'),
  s('nosql', 'NoSQL', 'Databases', ['no sql']),
  s('elasticsearch', 'Elasticsearch', 'Databases', ['elastic search', 'opensearch']),
  s('sqlserver', 'SQL Server', 'Databases', ['mssql', 'ms sql']),
  s('dynamodb', 'DynamoDB', 'Databases'),
  s('snowflake', 'Snowflake', 'Databases'),

  // Cloud & DevOps
  s('aws', 'AWS', 'Cloud & DevOps', ['amazon web services', 'ec2', 's3', 'lambda']),
  s('azure', 'Azure', 'Cloud & DevOps', ['microsoft azure']),
  s('gcp', 'GCP', 'Cloud & DevOps', ['google cloud', 'google cloud platform', 'bigquery']),
  s('docker', 'Docker', 'Cloud & DevOps', ['containers', 'containerization']),
  s('kubernetes', 'Kubernetes', 'Cloud & DevOps', ['k8s', 'helm']),
  s('terraform', 'Terraform', 'Cloud & DevOps', ['infrastructure as code', 'iac']),
  s('cicd', 'CI/CD', 'Cloud & DevOps', ['ci cd', 'continuous integration', 'continuous delivery', 'continuous deployment', 'github actions', 'jenkins', 'gitlab ci']),
  s('linux', 'Linux', 'Cloud & DevOps', ['unix']),
  s('git', 'Git', 'Cloud & DevOps', ['version control', 'github', 'gitlab', 'bitbucket']),
  s('observability', 'Monitoring & observability', 'Cloud & DevOps', ['monitoring', 'observability', 'prometheus', 'grafana', 'logging']),

  // Testing & Quality
  s('unittesting', 'Unit testing', 'Testing & Quality', ['unit tests', 'jest', 'vitest', 'pytest', 'junit', 'mocha']),
  s('e2e', 'End-to-end testing', 'Testing & Quality', ['end to end testing', 'e2e testing', 'cypress', 'playwright', 'selenium']),
  s('tdd', 'TDD', 'Testing & Quality', ['test driven development']),
  s('codereview', 'Code review', 'Testing & Quality', ['code reviews']),
  s('security', 'Application security', 'Testing & Quality', ['owasp', 'secure coding', 'appsec']),

  // Practices
  s('agile', 'Agile', 'Practices', ['scrum', 'kanban', 'sprint planning']),
  s('systemdesign', 'System design', 'Practices', ['distributed systems', 'software architecture', 'scalable systems']),
  s('oop', 'Object-oriented design', 'Practices', ['object oriented programming', 'object oriented design', 'oop', 'design patterns']),
  s('datastructures', 'Data structures & algorithms', 'Practices', ['data structures', 'algorithms']),
  s('performance', 'Performance optimization', 'Practices', ['performance tuning', 'optimization', 'profiling']),
  s('api-design', 'API design', 'Practices', ['api development', 'api integration', 'api integrations']),

  // Soft skills
  s('communication', 'Communication', 'Soft skills', ['communication skills', 'written and verbal', 'verbal and written']),
  s('leadership', 'Leadership', 'Soft skills', ['led a team', 'team lead', 'tech lead', 'lead engineer']),
  s('mentoring', 'Mentoring', 'Soft skills', ['mentored', 'mentor', 'coaching']),
  s('collaboration', 'Collaboration', 'Soft skills', ['cross functional', 'teamwork', 'collaborate', 'collaborated', 'collaborative']),
  s('problemsolving', 'Problem solving', 'Soft skills', ['problem solver', 'troubleshooting', 'debugging']),
  s('ownership', 'Ownership', 'Soft skills', ['self starter', 'self motivated', 'end to end ownership']),
  s('stakeholder', 'Stakeholder management', 'Soft skills', ['stakeholders', 'stakeholder']),
];

export const SKILL_BY_ID: ReadonlyMap<string, Skill> = new Map(SKILLS.map((sk) => [sk.id, sk]));
