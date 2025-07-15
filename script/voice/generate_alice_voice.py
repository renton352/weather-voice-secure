
import json
import requests
import os

# JSONLファイルの読み込み
with open("alice_voicevox_script.jsonl", "r", encoding="utf-8") as f:
    lines = [json.loads(line) for line in f]

# 出力先ディレクトリ
output_dir = "voice/alice"
os.makedirs(output_dir, exist_ok=True)

# 話者ID: 0 = 四国めたん（ノーマル）
speaker_id = 0

for entry in lines:
    text = entry["text"]
    file_name = entry["file_name"]
    print(f"▶ 生成中: {file_name} ...")

    # クエリ作成
    query_res = requests.post(
        "http://127.0.0.1:50021/audio_query",
        params={"text": text, "speaker": speaker_id}
    )
    if query_res.status_code != 200:
        print(f"❌ クエリ作成失敗: {file_name}")
        continue

    query = query_res.json()

    # 音声合成して保存
    synthesis_res = requests.post(
        "http://127.0.0.1:50021/synthesis",
        params={"speaker": speaker_id},
        json=query
    )
    if synthesis_res.status_code != 200:
        print(f"❌ 合成失敗: {file_name}")
        continue

    with open(os.path.join(output_dir, file_name), "wb") as out_file:
        out_file.write(synthesis_res.content)

    print(f"✅ 完了: {file_name}")

print("🎉 全ファイルの出力が完了しました。")
