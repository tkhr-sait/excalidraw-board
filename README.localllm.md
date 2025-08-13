# claude code で qwen3-coder を使う

- 公式の手順でローカル LLM 使ってみる
  - [LLM gateway configuration](https://docs.anthropic.com/en/docs/claude-code/llm-gateway)
  - [LiteLLM - Claude Code](https://docs.litellm.ai/docs/tutorials/claude_responses_api)

## 0. qwen3-coder

- https://huggingface.co/unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF
  - [official は tool calling に問題があるので、fix 版を使う](https://docs.unsloth.ai/basics/qwen3-coder-how-to-run-locally#tool-calling-fixes)
  - lm studio で model ロード。Q8_K_XL(35.99GB) ＆ コンテキスト長は 256k(262144) でも 128GB の M4mac なら安定動作。
  - 480B は無理...
  - cline ならまぁまぁの性能で動作

## 1. litellm で proxy

```bash
pip install 'litellm[proxy]'
litellm --config .litellm/config.yaml
```

## 2. claude 起動時に BASE_URL 変更し、model を指定

- tool 呼び出し:x:

```bash
export ANTHROPIC_BASE_URL="http://0.0.0.0:4000"
export ANTHROPIC_AUTH_TOKEN="dummy"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
```

- tool 呼び出し:x:

```bash
export ANTHROPIC_MODEL="qwen3-coder-30b-a3b-instruct"
export ANTHROPIC_MODEL="openai/gpt-oss-120b"
export ANTHROPIC_MODEL="unsloth/gpt-oss-120b"
export ANTHROPIC_SMALL_FAST_MODEL=${ANTHROPIC_MODEL}
claude --model ${ANTHROPIC_MODEL}
```

- youtube で、kimi-k2 を claude code経由で動かせてたけど、gpt-ossちと無理ぽい

# codex で

```
npm i -g @openai/codex
```

```
cat << __EOF__ > ~/.codex/config.toml
disable_response_storage = false

profile = "openai.gpt-oss-120b"

[model_providers.lmstudio]
name = "LMStudio"
base_url = "http://host.docker.internal:1234/v1"
wire_api = "chat"
env_key = "OPENAI_API_KEY"

[profiles.qwen3-coder]
model_provider = "lmstudio"
model = "qwen3-coder-30b-a3b-instruct"
model_context_window = 262144
model_supports_reasoning_summaries = false

[profiles.openai_gpt-oss-120b]
model_provider = "lmstudio"
model = "openai/gpt-oss-120b"
model_context_window = 131072
model_supports_reasoning_summaries = true
model_reasoning_effort = "low"

[profiles.unsloth_gpt-oss-120b]
model_provider = "lmstudio"
model = "unsloth/gpt-oss-120b"
model_context_window = 131072
model_supports_reasoning_summaries = true
model_reasoning_effort = "low"
__EOF__

OPEN_API_KEY=dummy codex -p qwen3-coder --full-auto

OPEN_API_KEY=dummy codex -p openai_gpt-oss-120b --full-auto
OPEN_API_KEY=dummy codex -p unsloth_gpt-oss-120b --full-auto
```

# opencode

```
npm i -g oepncode-ai@latest
cat << '__EOF__' > ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "lmstudio": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "LM Studio (local)",
      "options": {
        "baseURL": "http://host.docker.internal:1234/v1"
      },
      "models": {
        "openai/gpt-oss-120b": {
          "name": "openai/gpt-oss-120b"
        },
        "unsloth/gpt-oss-120b": {
          "name": "unsloth/gpt-oss-120b"
        },
        "qwen3-coder-30b-a3b-instruct": {
          "name": "qwen3-coder-30b-a3b-instruct"
        }
      }
    }
  }
}
__EOF__
```

# qwen3 code

- 導入

```
npm install -g @qwen-code/qwen-code@latest

```

- 実行

```
export OPENAI_BASE_URL="http://host.docker.internal:1234/v1"
export OPENAI_API_KEY="dummy"
export OPENAI_MODEL="qwen3-coder-30b-a3b-instruct"
export OPENAI_MODEL="unsloth/gpt-oss-120b"
export OPENAI_MODEL="openai/gpt-oss-120b"

/usr/local/share/npm-global/bin/qwen
```

# サマリ

- lm studio 0.3.22

| model / tool              | claude code | :x: codex             | opencode                     | qwen code                    | メモ                             |
| ------------------------- | ----------- | --------------------- | ---------------------------- | ---------------------------- | -------------------------------- |
| **qwen3-coder**           | :x:         | :warning: 不要 backup | :o:                          | :o:                          |                                  |
| **gpt-oss-120b(openai)**  | :x:         | :x: 更新なし           | :o:                          | :warning: 生成コードいまいち | 途中で中断                       |
| **gpt-oss-120b(unsloth)** | :x:         | :o:                   | :warning: 生成コードいまいち | :x: 更新なし                 | 変なタグ生成して中断することあり |

- prompt
  ```
  Reasoning_effort: Low.

  frontend/src/components/collab 下を調査し、excalidraw の変更履歴から excalidraw のキャンバスに書き戻す機能を作成して
  ```

- qwen3-coder

  - context_length: 262144

- gpt-oss

  - Reasoning_effort: Low
  - context length: 131072

- lm studio version
  - :o: 0.3.23 - unsloth 版は Reasoning
  - :x: 0.3.22 - gpt-oss 対応不十分
