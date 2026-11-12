# grok

讓 Claude 透過 xAI 的 API 詢問 Grok，取得另一個模型的意見。安裝後 Claude 會多一個 `ask_grok` 工具，當你說「問問 Grok」「請 Grok 給第二意見」時，Claude 會把問題送給 Grok 並帶回答案。

## 安裝

```
/plugin install grok --marketplace phtr-del/usage-pills
```

安裝時會要你填：

- **xAI API 金鑰**（必填）：從 console.x.ai 取得，標記為敏感資訊，存在系統安全儲存區（macOS 鑰匙圈），不會寫進設定檔。
- **Grok 模型**：預設 `grok-4`，可改成 xAI 提供的其他模型名稱。

## 注意

- API 依用量計費，費用由你的 xAI 帳號支付。
- 送給 Grok 的內容會傳到 xAI；公司機密資料請先確認公司政策。
