# ERC721 Token Deploy

## 準備

### Etherscan に会員登録し、API Key を取得する

[Etherscan に登録する](https://etherscan.io/register)
[API Keys](https://etherscan.io/myapikey)

### Alchemy に会員登録し、API Key を取得する

[Alchemy に登録する](https://www.alchemy.com/)
[Create App](https://dashboard.alchemy.com/apps)より、CHAIN を「Ethereum」、NETWORK を「Mainnet」で作成すると、アプリケーション詳細ダッシュボードへ遷移する。
そこで「VIEW KEY」を押下し、API key を取得する。

### API key と秘密鍵を「.env」に登録する

```
$ cp .env.dummy .env
```

- .env を開く
- 「.env」内に各種 Key 情報を貼り付ける
- ウォレットの秘密鍵を「WALLET_PRIVATE_KEY」に貼り付ける

### npm のインストール

`npm install`

# hardhat compile

`npx hardhat compile`

## テストの実行

`npx hardhat test`

## コントラクトのデプロイ

### local へのデプロイ

`npx hardhat run scripts/deploy.js`

### テストネットへデプロイ

`npx hardhat run scripts/deploy.js --network goerli`

### メインネットへデプロイ

`npx hardhat run scripts/deploy.js --network ethereum`

### etherscan へ verify

`npx hardhat verify --contract contracts/token.sol:TOKEN --network goerli デプロイしたコントラクトAddress`

### 本番

`npx hardhat verify --contract contracts/token.sol:TOKEN --network ethereum デプロイしたコントラクトAddress`

### hardhat の compile 情報をクリア

`npx hardhat clean`
