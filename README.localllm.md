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

```bash
export ANTHROPIC_BASE_URL="http://0.0.0.0:4000"
export ANTHROPIC_AUTH_TOKEN="dummy"
claude --model openai/qwen3-coder-30b-a3b-instruct
```
