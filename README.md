# usage-pills

Claude Code 提示框上方的用量膠囊列：5h／7d 用量與重置倒數、模型 context 視窗、ctx 用量、本次對話花費。

## 安裝

```
/plugin install usage-pills --marketplace phtr-del/usage-pills
```

依提示輸入 `y` 新增 marketplace，再選擇安裝範圍。

## 顯示內容

- **5h**：五小時用量條、百分比、距離重置時間（僅訂閱帳號）
- **模型視窗**：目前模型的 context 視窗大小，例如 1M
- **7d**：七日用量條、百分比、距離重置時間（僅訂閱帳號）
- **ctx**：目前對話已用 tokens／視窗大小與百分比
- **$**：本次對話累計花費（美元）

數值在每次回應後自動更新；問卷顯示時會暫時讓出位置。

## 同一個 repo 的其他外掛

- [grok](plugins/grok/README.md)：讓 Claude 透過 xAI API 詢問 Grok。安裝：`/plugin install grok --marketplace phtr-del/usage-pills`
