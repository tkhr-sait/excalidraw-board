# ADR-001: 技術スタックの選定

## タイトル: Excalidrawコラボレーションシステムの技術スタック選定

**ステータス**: 承認済み

**日付**: 2024-12-23

## コンテキスト
excalidrawを利用したリアルタイムコラボレーションシステムを構築するにあたり、以下の要件を満たす技術スタックを選定する必要がある：

- excalidraw公式リポジトリと同一仕様のコラボレーション機能
- Firebaseを使用しない
- ローカルネットワークでのセルフホスティング
- 10名以下での利用を想定
- excalidraw-roomを無改造で利用

## 検討した選択肢

### フロントエンド
1. **React + TypeScript + @excalidraw/excalidraw**
   - 利点:
     - excalidraw公式がReactベース
     - TypeScriptによる型安全性
     - 公式パッケージの利用で実装が容易
   - 欠点:
     - React特有の学習コスト

2. **Vue.js + TypeScript**
   - 利点:
     - シンプルな構文
   - 欠点:
     - excalidrawのVue版は非公式
     - 実装の手間が増える

3. **Vanilla JavaScript**
   - 利点:
     - フレームワーク依存なし
   - 欠点:
     - 開発効率が低い
     - 型安全性の欠如

### バックエンド
1. **excalidraw-room (Docker)**
   - 利点:
     - 公式提供のコラボレーションサーバー
     - Dockerイメージで簡単にデプロイ
     - 改造不要
   - 欠点:
     - カスタマイズ性が低い

2. **独自WebSocketサーバー**
   - 利点:
     - 完全なカスタマイズが可能
   - 欠点:
     - 開発工数が大きい
     - excalidrawとの互換性確保が困難

### 通信プロトコル
1. **WebSocket**
   - 利点:
     - リアルタイム双方向通信
     - excalidraw-roomがサポート
   - 欠点:
     - ファイアウォール設定が必要な場合がある

2. **WebRTC**
   - 利点:
     - P2P通信で低遅延
   - 欠点:
     - 実装が複雑
     - excalidraw-roomが未対応

## 決定
以下の技術スタックを採用する：

- **フロントエンド**: React + TypeScript + @excalidraw/excalidraw
- **バックエンド**: excalidraw-room (Docker公式イメージ)
- **通信プロトコル**: WebSocket
- **テスト**: Jest (単体テスト) + Playwright (E2Eテスト)
- **ビルドツール**: Vite
- **パッケージマネージャー**: npm

## 結果
### 良い結果
- excalidraw公式と同じ技術スタックで互換性が高い
- 公式のexcalidraw-roomを使用することで安定したコラボレーション機能
- TypeScriptによる型安全な開発
- Dockerによる簡単なデプロイ

### 悪い結果
- React特有の学習コストが必要
- excalidraw-roomのカスタマイズには制限がある

## 参考資料
- [Excalidraw公式リポジトリ](https://github.com/excalidraw/excalidraw)
- [Excalidraw-room公式リポジトリ](https://github.com/excalidraw/excalidraw-room)
- [Excalidrawドキュメント](https://docs.excalidraw.com/)