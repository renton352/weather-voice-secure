import csv
import json
import os

def csv_to_json(csv_file_path):
    # キャラクター名をファイル名から自動で取得（拡張子除去）
    character_name = os.path.splitext(os.path.basename(csv_file_path))[0]
    json_file_path = f"{character_name}.json"

    result = {
        "name": character_name,
        "expressions": {},
        "lines": {
            "timeSlotA": {},
            "feelingCategory": {},
            "weekday": {}
        }
    }

    with open(csv_file_path, newline="", encoding="utf-8-sig") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            category = row["category"]
            key = row["key"]
            value = row["value"]
            if category == "expression":
                result["expressions"][key] = value
            elif category in result["lines"]:
                result["lines"][category][key] = value

    with open(json_file_path, "w", encoding="utf-8") as jsonfile:
        json.dump(result, jsonfile, ensure_ascii=False, indent=2)
    print(f"✅ {character_name}.json を生成しました")

if __name__ == "__main__":
    # カレントディレクトリ内の .csv ファイルを全て処理
    for file in os.listdir("."):
        if file.endswith(".csv"):
            csv_to_json(file)
