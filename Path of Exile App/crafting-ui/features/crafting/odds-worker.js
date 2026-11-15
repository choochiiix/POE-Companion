import { createEngine, currencyOdds, SeededRng } from '/src/index.ts';
self.onmessage = ({ data }) => {
  try {
    const engine = createEngine(data.mods, data.config);
    const result = currencyOdds(engine, data.item, data.currency, data.goal, {
      rng: new SeededRng(2026),
      maxNodes: 2000,
      samples: data.samples,
    });
    self.postMessage({
      ok: true,
      result:
        result.method === 'exact'
          ? {
              method: result.method,
              probability: result.probability,
              outcomeCount: result.outcomes.length,
            }
          : result,
    });
  } catch (error) {
    self.postMessage({ ok: false, reason: error.message });
  }
};
