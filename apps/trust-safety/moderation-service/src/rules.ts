
/** Reglas heurísticas (multi-idioma ES/EN) simples y extensibles. */
export type Cat = "sexual"|"violence"|"hate"|"harassment"|"self_harm"|"illegal_goods"|"piracy"|"spam"|"scam"|"pii"|"profanity";

const W = (w: TemplateStringsArray) => new RegExp(w[0], "i");

// Nota: expresiones moderadas para demo; en prod separar por idioma y mantener diccionarios versionados.
export const RULES: Record<Cat, RegExp[]> = {
  sexual: [
    W`(?<!not\s)(?:explicit|porn|xxx|nsfw)\b`,
    W`\bsexo\b|\bporno\b|\bdesnudo\b`
  ],
  violence: [
    W`\b(kill|matar|asesinar|shoot|apuñalar|violate)\b`,
    W`\b(?:bomb|bomba|explosive)\b`
  ],
  hate: [
    W`\b(?:hate|odio)\s+(?:speech|racial|grupo)\b`,
    W`\b(?:deberían|should)\s+(?:morir|die)\b`
  ],
  harassment: [
    W`\b(?:idiot|estúpido|imbécil|loser)\b`,
    W`(?:go\s+kill\s+yourself|muérete)\b`
  ],
  self_harm: [
    W`\b(?:suicide|suicidio|self[-\s]?harm|cortarme)\b`
  ],
  illegal_goods: [
    W`\b(?:cocaine|cocaína|meth|anfetamina|fentanilo|weapons?|armas)\b`,
    W`\b(?:buy|venta)\s+(?:guns?|armas|drogas)\b`
  ],
  piracy: [
    W`\b(?:warez|torrent|piratear|piracy)\b`,
    W`\bdescargar\s+(?:gratis|free)\s+(?:pel[ií]culas|juegos)\b`
  ],
  spam: [
    W`(?:(?:http|https):\/\/)?(?:[\w-]+\.)+(?:ru|tk|cf|ml|gq)\b`,
    W`\bfree\s+money\b|\bgan[a|e] dinero r[aá]pido\b`,
    W`\bclick\s+here\b|\bhaz clic aqu[ií]\b`
  ],
  scam: [
    W`\b(?:giveaway|regalo)\s+crypto\b`,
    W`\b(?:seed\s?phrase|frase\s+semilla|clave\s+privada)\b`,
    W`\b(?:soporte|support)\s+de\s+(?:wallet|banco)\b.*\bcontact\b`
  ],
  pii: [
    W`\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b`,             // SSN-like
    W`\b(?:\d{16}|\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4})\b`, // tarjeta
    W`\b(?:\w+@\w+\.\w{2,})\b`                     // correo
  ],
  profanity: [
    W`\b(?:fuck|shit|joder|mierda|cabr[oó]n)\b`
  ]
};

export const PII_MASKERS: Array<{ re: RegExp; replace: (s: string) => string }> = [
  { re: /\b(\w+)@(\w+\.\w{2,})\b/gi, replace: (_s) => "<email_redacted>" },
  { re: /\b(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})\b/g, replace: (_s) => "<card_redacted>" },
  { re: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, replace: (_s) => "<ssn_redacted>" }
];


