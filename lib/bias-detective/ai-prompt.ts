import type { BiasDetectiveGameData } from './types'

const JSON_SCHEMA_DESCRIPTION = `{
  "learn": {
    "title": "string",
    "slides": [
      { "emoji": "string", "title": "string", "content": "string (HTML allowed)", "tip": "string" }
    ]
  },
  "quiz": {
    "title": "string",
    "questions": [
      {
        "q": "string",
        "options": ["string", "..."],
        "correct": 0,
        "explanation": "string"
      }
    ]
  },
  "scenarios": {
    "title": "string",
    "scenarios": [
      {
        "title": "string",
        "text": "string",
        "choices": [
          { "text": "string", "score": 0, "feedback": "string" }
        ]
      }
    ]
  },
  "matching": {
    "title": "string",
    "pairs": [
      { "bias": "string", "example": "string" }
    ]
  },
  "detective": {
    "title": "string",
    "cases": [
      {
        "title": "string",
        "text": "string",
        "clues": [
          { "text": "string", "bias": "string" }
        ]
      }
    ]
  },
  "speed": {
    "title": "string",
    "questions": [
      {
        "text": "string",
        "bias": "string (must exactly match one option)",
        "options": ["string", "..."]
      }
    ]
  }
}`

function truncateExample(content: BiasDetectiveGameData): BiasDetectiveGameData {
  return {
    learn: {
      title: content.learn.title,
      slides: content.learn.slides.slice(0, 2),
    },
    quiz: {
      title: content.quiz.title,
      questions: content.quiz.questions.slice(0, 2),
    },
    scenarios: {
      title: content.scenarios.title,
      scenarios: content.scenarios.scenarios.slice(0, 1),
    },
    matching: {
      title: content.matching.title,
      pairs: content.matching.pairs.slice(0, 3),
    },
    detective: {
      title: content.detective.title,
      cases: content.detective.cases.slice(0, 1),
    },
    speed: {
      title: content.speed.title,
      questions: content.speed.questions.slice(0, 2),
    },
  }
}

export function buildBiasDetectiveAIPrompt(options: {
  exampleContent: BiasDetectiveGameData
  exampleSetTitle?: string
}): string {
  const example = truncateExample(options.exampleContent)
  const exampleTitle = options.exampleSetTitle?.trim() || 'Reference question set'

  return [
    'You are creating a new Bias Detective question set for a classroom learning game.',
    '',
    '## Purpose of Bias Detective',
    'Bias Detective is an interactive classroom activity that teaches middle and high school students to recognize cognitive biases in everyday situations. Students move through six sections: Learn (slides), Quiz (multiple choice), Scenarios (branching choices with scores), Matching (bias to example), Detective (find biases in cases), and Speed (timed bias identification).',
    '',
    '## Student age range',
    'Ages 12–18 (grades 7–12). Use age-appropriate language, relatable school/social media/shopping examples, and no graphic or adult content.',
    '',
    '## Difficulty expectations',
    '- Medium difficulty: concepts should be clear but not oversimplified.',
    '- Quiz: 8–12 questions with plausible distractors.',
    '- Scenarios: 4–6 scenarios, each with 3 choices; best choice score 10, partial 2–3, poor 0–1.',
    '- Matching: 6–8 pairs covering distinct biases.',
    '- Detective: 3–5 cases with 3–5 clues each.',
    '- Speed: 8–12 rapid-fire questions; each question\'s "bias" field must exactly match one option string.',
    '- Learn slides: 6–10 short teaching slides with emoji, title, content (HTML <br> and <strong> allowed), and a tip.',
    '',
    '## Required JSON schema',
    'Return a single JSON object with EXACTLY these top-level keys and no others: learn, quiz, scenarios, matching, detective, speed.',
    '',
    JSON_SCHEMA_DESCRIPTION,
    '',
    `## Example from current selected set ("${exampleTitle}")`,
    'Use this structure and tone. Generate NEW original content — do not copy verbatim:',
    '',
    JSON.stringify(example, null, 2),
    '',
    '## Output rules (strict)',
    '- Return ONLY valid JSON.',
    '- No markdown code fences.',
    '- No commentary, explanations, or text before or after the JSON.',
    '- The JSON must be directly uploadable to the Bias Detective Question Set Manager.',
    '- Every required section must be non-empty.',
    '- All string fields must be non-empty.',
    '- quiz.correct must be a zero-based index into options.',
    '- speed.bias must exactly equal one of the options for that question.',
  ].join('\n')
}
