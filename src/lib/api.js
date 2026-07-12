// src/lib/api.js
export function createApi(baseUrl, fetchImpl) {
  const f = fetchImpl || globalThis.fetch;
  async function call(payload) {
    const res = await f(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
  return {
    getGame: (gameId) => call({ action: 'getGame', gameId }),
    submitGuess: (gameId, name, guess) => call({ action: 'submitGuess', gameId, name, guess }),
    submitCode: (gameId, name) => call({ action: 'submitCode', gameId, name }),
    getReveal: (gameId, name) => call({ action: 'getReveal', gameId, name }),
    checkFinalKey: (gameId, key) => call({ action: 'checkFinalKey', gameId, key }),
    createGame: (adminPw, cfg) => call({ action: 'createGame', adminPw, ...cfg }),
    setRevealOpen: (adminPw, gameId, open) => call({ action: 'setRevealOpen', adminPw, gameId, open }),
  };
}
