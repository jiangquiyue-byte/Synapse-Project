from __future__ import annotations

import json
from pathlib import Path

from fastembed import TextEmbedding

OUT = Path('/home/ubuntu/projects/Synapse-Project/research/fastembed_model_probe_results.json')


def main() -> None:
    models = TextEmbedding.list_supported_models()
    preferred = [
        'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
        'intfloat/multilingual-e5-small',
        'BAAI/bge-small-en-v1.5',
    ]

    results: dict[str, object] = {
        'supported_model_count': len(models),
        'sample_supported_models': models[:20],
        'probes': [],
    }

    for model_name in preferred:
        entry: dict[str, object] = {'model_name': model_name}
        try:
            model = TextEmbedding(model_name=model_name)
            vector = next(model.embed(['语义记忆 测试 semantic memory retrieval']))
            vector_list = vector.tolist() if hasattr(vector, 'tolist') else list(vector)
            entry['ok'] = True
            entry['dimension'] = len(vector_list)
            entry['sample_head'] = vector_list[:8]
        except Exception as exc:
            entry['ok'] = False
            entry['error'] = f'{type(exc).__name__}: {exc}'
        results['probes'].append(entry)

    OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print(str(OUT))


if __name__ == '__main__':
    main()
