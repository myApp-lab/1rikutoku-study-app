第一級陸上特殊無線技士 一陸特トレーニング

【収録データ】
・2022年2月 法規 JY42A / JY42B
・2022年2月 無線工学 JZ42A / JZ42B
・2022年6月 無線工学 JZ46A（現在5問収録）

【主な機能】
・学習モード（回答直後に採点）
・ランダム10問
・本番モード（一括採点）
・音声モード
・聞き流しモード
・苦手問題の再出題
・学習履歴
・問題画像の拡大表示
・PWA / オフラインキャッシュ

【PCで確認する場合】
index.htmlを直接開いて基本動作を確認できます。
PWA機能（オフライン・ホーム画面追加）を確認する場合はHTTPSで配信してください。

【iPhoneで使う場合】
1. このフォルダ一式を静的Webサーバーへ配置します。
2. iPhoneのSafariで公開URLを開きます。
3. Safariの共有 →「ホーム画面に追加」を選択します。

※学習履歴は端末ブラウザ内に保存されます。
※音声は端末のSpeech Synthesis機能を使うため、利用できる声は端末/iOSに依存します。

【高品質AI音声について】
この版は「端末標準音声」と「高品質AI音声」を切り替えられます。
高品質AI音声はAPIキーをWebアプリ内に保存せず、GitHub Actionsで事前にMP3を生成する方式です。
そのため公開GitHub PagesからAPIキーが漏れることはありません。

生成前に高品質AI音声を選んだ場合、該当MP3が無ければ端末標準音声へ自動フォールバックします。

GitHubでの準備：
1. OpenAI APIでAPIキーを発行します（ChatGPTの契約とは別のAPI利用です）。
2. GitHubリポジトリ → Settings → Secrets and variables → Actions → New repository secret。
3. Nameを OPENAI_API_KEY とし、Secret欄へAPIキーを保存します。
4. リポジトリの Actions → Generate AI audio → Run workflow。
5. voiceを選び、Run workflowを実行します。
6. 完了すると audio/ai/<voice>/... のMP3が自動コミットされ、GitHub Pagesも自動更新されます。

音声生成にはOpenAI API利用料金が発生します。既に生成済みのMP3はスクリプトがスキップするため、同じ音声を再実行しても原則として再生成しません。
