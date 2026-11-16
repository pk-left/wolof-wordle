# Wolof Wordle

Guess today's 5-letter Wolof word in six tries, then look up any word in the Wolof-English dictionary.

- **Play**: a daily word for everyone (new at midnight GMT) plus a practice mode, streaks and shareable results.
- **Dictionary**: search Wolof → English or English → Wolof, with or without accents (`jerejef` finds *jërëjëf*). Browse by topic, word of the day, and a link from every game answer.
- **Suggest a word**: visitors can send new words and corrections. Suggestions wait for review before they're added.
- **Works offline** once opened, and installs to a phone's home screen.

The look is borrowed from two of Jangal's gallery themes, both after Pablo Picasso: **Cubist** (light) and **Blue Period** (dark).

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The game |
| `dictionary/index.html` | The dictionary and the suggestion form |
| `data/words.js` | Game answers: `[word, meaning]`, 5 letters, no accents |
| `data/dict.js` | Dictionary entries: `[wolof, part of speech, english, category]` |
| `assets/site.css` | Cubist and Blue Period themes |
| `assets/site.js` | Shared helpers: top bar, theme, sound, sharing, confetti |
| `functions/api/suggest.js` | Cloudflare Pages Function that stores suggestions |
| `review/` | Private page for reading and clearing suggestions |
| `sw.js` | Offline support |

Every game answer is automatically in the dictionary. To add a dictionary word, add a line to `data/dict.js`. To add a game word, add it to `data/words.js` (the daily order is a fixed shuffle of that list, so adding words changes which word falls on which day).

## The word list needs a fluent check

The dictionary is a starter list drafted by Claude. Spellings differ between Gambian and Senegalese Wolof, and some entries are marked `// CHECK` in `data/dict.js`. Fix or remove anything that looks wrong.

## Hosting on Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → connect this GitHub repo.
2. Build settings: framework **None**, build command empty, output directory `/`.
3. To turn on suggestions:
   - **Workers & Pages → KV** → create a namespace, e.g. `wolof-suggestions`.
   - Your Pages project → **Settings → Bindings** → add a **KV namespace** binding with variable name `SUGGESTIONS`.
   - **Settings → Variables and secrets** → add a secret `ADMIN_KEY` (a long password only you know).
   - Redeploy.
4. Read suggestions at `/review/` with your admin key. Without the KV binding the form still works: suggestions wait on the visitor's phone and send once it's set up.

## Run it locally

```
python -m http.server 8000
```

then open http://localhost:8000. (The suggestion form needs Cloudflare to actually send; locally it saves to the outbox.)

## Credits

Fonts: Bricolage Grotesque and Old Standard TT, both under the SIL Open Font License (see `assets/fonts/`).
Code under the MIT License.
