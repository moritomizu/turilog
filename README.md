# TsuriLog

スマートフォンで釣果写真を投稿し、魚種・サイズ・釣った場所・釣った時刻・潮位情報を保存できる個人用の釣果ログWebアプリです。

MVPでは自分自身の釣果管理と潮位分析に集中しています。将来的には釣り大会モード、参加者別ランキング、投稿承認、天気・風・気圧連携、画像AI判定などを追加しやすいよう、Firebaseと型定義を分けた構成にしています。

## 主な機能

- Googleログイン
- 釣果写真のFirebase Storage保存
- 釣果データのCloud Firestore保存
- 釣った日時と緯度経度から潮位APIを呼び出し、潮位・上げ潮/下げ潮・何分目などを自動保存
- 新着順の釣果一覧
- 年間、魚種別、月別の最大サイズランキング
- Google Maps上の釣果マーカー表示
- 潮位傾向の表形式分析
- 明石海峡、鳴門海峡、友ヶ島水道などの海上保安庁潮流曲線ページへのリンク保存
- 釣った場所と日時に基づく当時の天候、風速、気温、降水量、雲量、旧暦、月齢の保存
- 気象庁の沿岸域海面水温情報に基づく当時の水温リンク/値の保存
- 過去投稿から魚種・コメント候補を表示するクイック投稿UI
- 任意のタックル情報と過去タックル候補の保存
- 現在地、釣りエリア選択、地図ピン、過去地点、緯度経度入力による場所指定
- 釣り大会の作成、参加、大会投稿、承認、ランキング表示

## 必要なサービス

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Google Maps JavaScript API
- Stormglass Global Tide API または WorldTides API
- Open-Meteo Weather API
- 気象庁 沿岸域の海面水温情報

## Firebaseプロジェクトの作り方

1. [Firebase Console](https://console.firebase.google.com/) を開きます。
2. 「プロジェクトを追加」を押します。
3. プロジェクト名を入力します。
4. Google AnalyticsはMVPでは任意です。
5. 作成後、プロジェクト設定からWebアプリを追加します。
6. 表示されるFirebase SDK設定値を `.env.local` に入れます。

## Firebase Authenticationの設定方法

1. Firebase Consoleで「Authentication」を開きます。
2. 「始める」を押します。
3. 「Sign-in method」から「Google」を選びます。
4. 有効化し、サポートメールを選択して保存します。
5. ローカル開発では `localhost` が承認済みドメインに入っていることを確認します。

## Firestoreの有効化方法

1. Firebase Consoleで「Firestore Database」を開きます。
2. 「データベースの作成」を押します。
3. まずはテストモードで開始できます。
4. 本番公開時は必ずセキュリティルールを見直してください。

保存先コレクション:

- `users`
- `catches`

釣果一覧はFirestoreの複合インデックスがなくても動くように、ユーザー別に取得してアプリ側で新着順に並べ替えています。投稿数が増えてきたら、`firestore.indexes.json` の `userId ASC / caughtAt DESC` インデックスをFirebaseへ反映すると読み込み効率がよくなります。

Firestoreのインデックスエラーが表示された場合は、エラーメッセージ内のリンクを開いて作成してもOKです。

### 埋め込み公開を使う場合のFirestoreルール例

ブログやSNSに釣果カードを埋め込む場合、公開用の `publicCatches` コレクションだけをログインなしで読める必要があります。元の `catches` ではなく、緯度経度・ポイント名を抜いた埋め込み専用データを公開します。

まずはMVPとして、以下のような考え方でルールを設定します。

```txt
match /catches/{catchId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}

match /publicCatches/{catchId} {
  allow read: if resource.data.isPublic == true;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

## Firebase Storageの有効化方法

1. Firebase Consoleで「Storage」を開きます。
2. 「始める」を押します。
3. まずはテストモードで開始できます。
4. 本番公開時はログインユーザーだけが自分の画像を保存できるルールに変更してください。

## Google Maps APIキーの取得方法

1. [Google Cloud Console](https://console.cloud.google.com/) を開きます。
2. Firebaseと同じ、または任意のプロジェクトを選びます。
3. 「APIとサービス」から「Maps JavaScript API」を有効化します。
4. 「認証情報」でAPIキーを作成します。
5. 本番ではHTTPリファラー制限を設定してください。

## 潮位APIキーの取得方法

Stormglassを使う場合:

1. [Stormglass](https://stormglass.io/) でアカウントを作成します。
2. APIキーを取得します。
3. `.env.local` に `TIDE_API_PROVIDER=stormglass` と `STORMGLASS_API_KEY` を設定します。

WorldTidesを使う場合:

1. [WorldTides](https://www.worldtides.info/) でAPIキーを取得します。
2. `.env.local` に `TIDE_API_PROVIDER=worldtides` と `WORLDTIDES_API_KEY` を設定します。

## .env.localの設定方法

`.env.local.example` をコピーして `.env.local` を作ります。

```bash
cp .env.local.example .env.local
```

中身を自分のキーに置き換えます。

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

TIDE_API_PROVIDER=stormglass
STORMGLASS_API_KEY=your_stormglass_api_key
WORLDTIDES_API_KEY=your_worldtides_api_key
```

FirebaseやAPIキーが未設定でも、画面上に不足している設定名が表示されます。

潮位APIキーは公開ブラウザへ出さないため、`NEXT_PUBLIC_` を付けないサーバー側環境変数として設定します。

## ローカルで起動する方法

依存関係をインストールします。

```bash
npm install
```

開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで開きます。

```text
http://localhost:3000
```

## 潮の何分目の計算

干潮から満潮へ向かっている場合は上げ潮、満潮から干潮へ向かっている場合は下げ潮です。

前回の潮止まりから次回の潮止まりまでの時間を10等分し、釣った時刻がどの位置にあるかを `上げ3分` のように保存します。

## 海上保安庁の潮流曲線リンク

位置情報付きで投稿した場合、投稿地点に近い代表的な潮流推算地点を選び、海上保安庁 第五管区海上保安本部の潮流曲線ページへのリンクを保存します。

現在対応している地点:

```text
明石海峡（2号灯浮標付近）
明石海峡（3号灯浮標付近）
鳴門海峡
友ヶ島水道
```

選択ルール:

```text
神戸・本州側の明石周辺 → 明石海峡（2号灯浮標付近）
淡路島側の明石周辺 → 明石海峡（3号灯浮標付近）
和歌山・大阪湾南部周辺 → 友ヶ島水道
その他は代表地点の中から距離が近い地点
```

保存される項目:

```text
officialCurrentStationName
officialCurrentStationDistance
officialCurrentCurveUrl
officialCurrentSourceName
officialCurrentDate
officialCurrentNote
```

注意: 潮流曲線は推算地点のデータです。推算地点以外では実際の流れと異なる場合があります。航海目的ではなく、釣果記録の振り返り用途として利用してください。

## 当時の天候・風速・旧暦の保存

位置情報付きで投稿した場合、釣った日時と緯度経度をもとに [Open-Meteo](https://open-meteo.com/) から近い時刻の1時間ごとの天候データを取得して保存します。Open-MeteoはAPIキー不要で利用できます。

当時の天候、当時の風、当時の気温は投稿時点の現在値ではなく、`caughtAt` に入力した日時と投稿位置の緯度経度に最も近い1時間データを保存します。古い日付はOpen-Meteo Archive API、直近や未来日はForecast APIを参照します。実測観測所の値そのものではなく、Open-Meteoの気象モデル/再解析データとして扱ってください。

保存される主な項目:

```text
weather.weatherLabel
weather.weatherCode
weather.temperatureC
weather.precipitationMm
weather.cloudCoverPercent
weather.windSpeedMs
weather.windDirectionDeg
weather.windDirectionLabel
weather.windGustMs
weather.weatherSourceName
weather.weatherSourceUrl
weather.weatherFetchedAt
```

旧暦と月齢は外部APIを使わず、投稿日時からアプリ内で計算します。

```text
lunar.lunarDateLabel
lunar.lunarYearName
lunar.lunarMonthLabel
lunar.lunarDay
lunar.moonAge
lunar.moonPhase
lunar.moonPhaseLabel
```

位置情報がない投稿では、当時の天候・風速は未取得として保存されます。旧暦と月齢は日時だけで計算できるため保存されます。

## 当時の水温の保存

位置情報付きで投稿した場合、釣った地点に近い気象庁の沿岸域海面水温情報の海域を選び、当時日付に近い水温値と公式ページリンクを保存します。

保存される項目:

```text
seaTemperature.seaTemperatureC
seaTemperature.seaTemperatureAreaName
seaTemperature.seaTemperatureAreaCode
seaTemperature.seaTemperatureDate
seaTemperature.seaTemperatureSourceName
seaTemperature.seaTemperatureSourceUrl
seaTemperature.seaTemperatureFetchedAt
```

気象庁の公開テキストから値を取得できない場合でも、参照海域名と公式ページリンクは保存します。沿岸域の広域データなので、港内やピンポイントの表層水温とは差が出る場合があります。

## 釣り大会機能

複数ユーザーが大会に参加し、開催期間中の釣果でランキングを競えるMVP機能です。大会投稿は通常の個人釣果ログとしても保存されるため、釣果一覧、個人ランキング、分析にも反映されます。

### 大会作成方法

`/tournaments/new` から大会を作成します。

入力項目:

```text
大会名
説明
開始日時
終了日時
対象魚種
ランキング方式
ルール説明
公開/非公開
参加上限人数
```

ランキング方式:

```text
最大サイズ1匹勝負
合計サイズ
匹数勝負
```

公開設定:

```text
公開大会
- 誰でも参加できる公募大会です。
- /tournaments の大会一覧に表示されます。
- ランキングや大会釣果はログイン中の一般ユーザーも閲覧できます。

非公開大会
- 仲間だけで行うクローズド大会です。
- /tournaments の大会一覧には表示されません。
- 作成者が大会詳細URLを仲間に共有し、共有されたユーザーが参加します。
- ランキング、参加者、大会釣果は参加者と作成者のみ閲覧できます。
```

### 大会参加方法

公開大会は `/tournaments` から大会一覧を開き、大会詳細ページで参加名を入力して参加します。非公開大会は作成者から共有された大会詳細URLを開き、参加名を入力して参加します。参加時には任意でアイコン画像を設定できます。同じユーザーが同じ大会に重複参加しないよう、`tournamentParticipants` は `tournamentId_userId` の固定IDで保存します。

参加後は大会詳細ページから大会を抜けられます。大会を抜けると参加者一覧から外れますが、すでに投稿した個人釣果ログ自体は削除されません。

### 大会投稿方法

大会詳細ページの「大会釣果を投稿」から投稿すると、投稿画面に大会が自動選択されます。通常の投稿画面からも、参加中の大会を選択できます。

大会エントリー条件:

```text
caughtAt が大会期間内
位置情報あり
サイズが0より大きい
対象魚種に一致
```

条件を満たさない場合は大会エントリーせず、通常の個人ログとして保存します。

### 承認フロー

大会投稿は最初 `tournamentEntryStatus: pending` で保存されます。大会作成者は `/tournaments/[tournamentId]/admin` から承認または却下できます。

承認済みの投稿のみ、大会ランキングに反映されます。

### 大会削除

大会作成者のみ、大会詳細ページの主催者メニューから大会を削除できます。削除すると大会データ、参加者データ、大会ランキングは削除されます。大会に紐づいていた釣果は削除せず、通常の個人釣果ログとして残します。

### Firestore構造

```text
tournaments
- ownerId
- name
- description
- startAt
- endAt
- targetFishTypes
- rankingType
- rules
- visibility
- maxParticipants
- createdAt
- updatedAt

tournamentParticipants
- tournamentId
- userId
- userName
- avatarUrl
- joinedAt
- status

catches 追加項目
- tournamentId
- isTournamentEntry
- tournamentEntryStatus
- tournamentSubmittedAt
```

### 将来的な拡張予定

```text
EXIF撮影日時チェック
EXIF GPSチェック
画像重複チェック
大会エリア外判定
AI魚種判定
メジャー画像確認
投稿の詳細審査
参加者招待
非公開大会の招待コード
賞品/スポンサー表示
```

## クイック投稿UI

釣り中でも短時間で投稿できるように、投稿画面は以下の操作を優先しています。

- 写真、魚種、サイズ、投稿ボタンを中心に配置
- 魚種は過去投稿から頻出順に候補を表示
- コメントも過去入力から候補を表示
- サイズは `-5`、`-1`、`+1`、`+5` ボタンで微調整
- 釣った日時は初期値を現在時刻に設定
- 「時刻を今にする」ボタンで即更新
- 「現在地を取得」ボタンで潮位、当時の天候、潮流曲線リンクに必要な位置を保存
- コメントや日時変更は詳細入力に折りたたみ
- 写真はカメラ撮影と写真ライブラリ選択の両方に対応
- タックル情報は任意入力で、過去投稿から候補を表示
- 過去釣果を登録するときは、釣りエリア選択、地図ピン、過去地点候補、緯度経度入力で場所を指定可能

タックル情報として保存される項目:

```text
tackle.lureName
tackle.lureColor
tackle.rodName
tackle.reelName
tackle.lineName
tackle.leaderName
```

釣りエリア選択は、つりそくの「釣り場こだわり検索」に掲載されているエリア名を参考にしたアプリ内マスタを使います。選んだエリアの代表地点を入れたあと、「地図でピン指定」で細かい場所を微調整できます。

地図ピン指定はGoogle Maps JavaScript APIを使います。地図ピン指定は「地図でピン指定」を開いた時だけ地図を読み込みます。

Google Mapsは表示回数やAPI利用量に応じた従量課金です。個人利用の少量テストなら大きな負担になりにくいですが、ユーザー数が増えると地図表示やGeocoderの利用回数に応じて費用が増える可能性があります。本格的にスケールする場合は、地図を必要時だけ開く、過去地点候補を優先する、MapLibre/OpenStreetMap系の構成を検討する、などの対策を検討してください。

## デプロイ候補

- Vercel
- Firebase Hosting
- Google Cloud Run

まずはNext.jsとの相性がよいVercelが簡単です。デプロイ先にも `.env.local` と同じ環境変数を設定してください。

## Vercelで公開する方法

スマホから釣り場で投稿するには、ローカルの `http://localhost:3000` ではなく、HTTPSで公開されたURLが必要です。まずはVercelへのデプロイがおすすめです。

### 1. GitHubにアップロードする

このプロジェクトをGitHubのリポジトリに push します。

まだGit管理していない場合の例:

```bash
git init
git add .
git commit -m "Initial fishing log MVP"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
git push -u origin main
```

### 2. Vercelにインポートする

1. [Vercel](https://vercel.com/) にログインします。
2. `Add New...` → `Project` を選びます。
3. GitHubリポジトリを選びます。
4. Framework Preset が `Next.js` になっていることを確認します。
5. 環境変数を登録します。

### 3. Vercelに設定する環境変数

Vercelの `Project Settings` → `Environment Variables` に以下を登録します。

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
TIDE_API_PROVIDER
STORMGLASS_API_KEY
WORLDTIDES_API_KEY
```

`NEXT_PUBLIC_` が付くものはブラウザで使う値、付かない `STORMGLASS_API_KEY` などはサーバー側だけで使う秘密の値です。

### 4. デプロイする

環境変数を入れたら `Deploy` を押します。成功すると以下のようなURLが発行されます。

```text
https://your-app-name.vercel.app
```

### 5. Firebase Authenticationにドメインを追加する

Firebase Consoleで以下に進みます。

```text
Authentication
→ 設定
→ 承認済みドメイン
```

Vercelのドメインを追加します。

```text
your-app-name.vercel.app
```

### 6. Google Maps APIキーにVercel URLを追加する

Google Cloud ConsoleのAPIキー制限で、HTTPリファラーに以下を追加します。

```text
https://your-app-name.vercel.app/*
```

ローカル確認用の以下も残しておくと便利です。

```text
http://localhost:3000/*
```

### 7. スマホで確認する

スマホでVercelのURLを開き、Googleログイン、位置情報許可、写真投稿を確認します。位置情報を使うため、公開URLはHTTPSである必要があります。VercelのURLは自動でHTTPSになります。

## 今後の拡張候補

- 釣り大会モード
- 参加者別ランキング
- 大会期間設定
- 投稿承認機能
- EXIFから撮影日時・GPS取得
- 魚種別詳細分析
- 潮回り表示
- 大潮・中潮・小潮の分類
- 天気情報連携
- 気圧情報連携
- 風速情報連携
- 画像AIによる魚種判定
- メジャー画像からサイズ推定
- LINE通知
- 多言語対応
