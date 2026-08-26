#!/usr/bin/env python3
"""Build and optionally verify the Round 1 WeChat mini-game ranking snapshot.

The ranking rows are a checked transcription of the charts embedded in the
DataEye/Gravity Engine July 2026 article. The probe mode verifies that the
article remains reachable and still contains the expected chart and game
names; OCR is intentionally not required.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / ".agent_workspace" / "round1" / "rankings.json"

PRIMARY_URL = "https://www.36kr.com/p/3923287949176195"
PRIMARY_CHART_URL = (
    "https://img.36krcdn.com/hsossms/20260803/"
    "v2_de6fbb6a2a7e4d3cb45ae6696bbbb1a3@000000_oswg730235oswg870oswg1340_img_000"
    "?x-oss-process=image/format,jpg/interlace,1"
)
IAA_CHART_URL = (
    "https://img.36krcdn.com/hsossms/20260803/"
    "v2_f7011aa5944c4ac99332fcb31831e4af@000000_oswg590555oswg872oswg1345_img_000"
    "?x-oss-process=image/format,jpg/interlace,1"
)


def source(source_id: str, title: str, publisher: str, date: str, url: str, **extra: Any) -> dict[str, Any]:
    row = {
        "id": source_id,
        "title": title,
        "publisher": publisher,
        "published_date": date,
        "url": url,
    }
    row.update(extra)
    return row


SOURCES = [
    source(
        "s1",
        "7月百强小游戏：三七互娱、冰川网络新品上榜，豪腾2款产品高增，IAA又有新like跑出",
        "36氪 / DataEye",
        "2026-08-03",
        PRIMARY_URL,
        provenance="DataEye与引力引擎联合月榜",
        evidence="正文说明口径；嵌入图表给出完整排名、月平均排名和趋势",
    ),
    source(
        "s2",
        "权威！7月百强小游戏：三七互娱、冰川网络新品上榜，豪腾2款产品高增，IAA又有新like跑出",
        "网易 / DataEye",
        "2026-08-03",
        "https://c.m.163.com/news/a/L3DIIN7K0553OKLX.html",
        provenance="DataEye原文镜像",
        evidence="确认榜首、2-5名、镇邪人进入TOP8及榜单口径",
    ),
    source(
        "s3",
        "7月小游戏百强榜",
        "游戏客栈",
        "2026-08-18",
        "http://www.gamekezhan.com/news/20260818/64711.html",
        provenance="引力引擎月榜二次报道",
        evidence="确认畅销榜前五、畅玩榜前五及买量榜交集",
    ),
    source(
        "s4",
        "7月微信小游戏畅销榜Top 100：《我的花园世界》登顶、三七6款入榜领跑",
        "GameLook",
        "2026-08",
        "http://www.gamelook.com.cn/2026/08/599222/",
        provenance="GameLook独立月度统计序列",
        evidence="提供不同统计口径的完整Top 10，用于交叉校验而非合并",
    ),
    source(
        "s5",
        "小游戏2025年度回顾：平台重视、政策扶持，竞争激烈但仍有机会",
        "36氪",
        "2026-01-26",
        "https://36kr.com/p/3660445275988615",
        evidence="年度趋势及头部产品长线表现",
    ),
    source(
        "s6",
        "QuestMobile2025手机游戏行业发展分析报告",
        "36氪 / QuestMobile",
        "2025-10",
        "https://www.36kr.com/p/3518304729176969",
        evidence="2025年8月微信小游戏MAU与头部产品交叉校验",
    ),
    source(
        "s7",
        "2025年12月小游戏六维榜单",
        "网易 / 游戏客栈",
        "2026-01-16",
        "https://c.m.163.com/news/a/KJDVMCCQ05466ZM9.html",
        provenance="引力引擎月榜",
        evidence="2025年12月畅销榜前五、畅玩榜前六",
    ),
    source(
        "s8",
        "1月百强小游戏：三七互娱《生存33天》冲入前二",
        "腾讯新闻 / DataEye",
        "2026-02-03",
        "https://news.qq.com/rain/a/20260203A01KOA00",
        provenance="DataEye与引力引擎联合月榜",
        evidence="2026年1月ADX口径完整Top 10",
    ),
    source(
        "s9",
        "7月微信小游戏畅销榜TOP100：传奇站稳前十，3款新游跻身TOP30",
        "GameLook",
        "2025-08",
        "http://www.gamelook.com.cn/2025/08/575846/",
        evidence="2025年7月完整Top 10历史基线",
    ),
]


IAP_TOP_10 = [
    {
        "rank": 1,
        "game": "向僵尸开炮",
        "category_on_chart": "休闲",
        "monthly_average_rank": 3.9,
        "genre": "Roguelike割草射击 + 塔防 + 轻RPG养成",
        "operator_on_chart": "海南盛昌网络科技有限公司",
        "replication": {
            "level": "medium-hard",
            "core_mvp": "可复刻单局守墙、技能三选一与弹幕割草",
            "full_parity_risk": "局外养成、赛季、军团和长期数值/内容运营复杂",
        },
        "confidence": "high",
        "source_ids": ["s1", "s2", "s3"],
    },
    {
        "rank": 2,
        "game": "三国：冰河时代",
        "category_on_chart": "其他",
        "monthly_average_rank": 4.0,
        "genre": "冰雪生存模拟经营 + 三国4X SLG",
        "operator_on_chart": "欢乐互动（北京）科技有限公司",
        "replication": {
            "level": "hard",
            "core_mvp": "可做单机城建/资源循环原型",
            "full_parity_risk": "联盟、赛季、同步战争、反作弊和重度后端门槛高",
        },
        "confidence": "high",
        "source_ids": ["s1", "s2", "s3"],
    },
    {
        "rank": 3,
        "game": "灵画师",
        "category_on_chart": "角色",
        "monthly_average_rank": 5.3,
        "genre": "国风修仙放置RPG + 开箱装备养成",
        "operator_on_chart": "广州炫游网络科技有限公司",
        "replication": {
            "level": "medium-hard",
            "core_mvp": "可做打怪开箱、装备替换和放置战斗",
            "full_parity_risk": "多职业克制、灵兽、PVP及深层经济需大量平衡",
        },
        "confidence": "high",
        "source_ids": ["s1", "s2", "s3"],
    },
    {
        "rank": 4,
        "game": "疯狂水世界",
        "category_on_chart": "休闲",
        "monthly_average_rank": 6.7,
        "genre": "海上生存模拟经营 + 卡牌养成 + 轻SLG",
        "operator_on_chart": "益世界网络科技有限公司",
        "replication": {
            "level": "hard",
            "core_mvp": "可做拾荒、生产链和基地扩建原型",
            "full_parity_risk": "经营、卡牌、联盟城战三套系统耦合且需服务端",
        },
        "confidence": "high",
        "source_ids": ["s1", "s2", "s3"],
    },
    {
        "rank": 5,
        "game": "我的花园世界",
        "category_on_chart": "休闲",
        "monthly_average_rank": 7.0,
        "genre": "种花/插花模拟经营 + 社交",
        "operator_on_chart": "厦门麟贝互娱科技有限公司",
        "replication": {
            "level": "medium",
            "core_mvp": "种植、收获、订单、解锁新品种的循环清晰",
            "full_parity_risk": "长线内容量、公会/好友生态和经济调优成本高",
        },
        "confidence": "high",
        "source_ids": ["s1", "s2", "s3"],
    },
    {
        "rank": 6,
        "game": "跃动小子",
        "category_on_chart": "休闲",
        "monthly_average_rank": 7.3,
        "genre": "开箱养成 + 休闲RPG/闯关",
        "operator_on_chart": "波克科技集团有限公司",
        "replication": {
            "level": "medium",
            "core_mvp": "开箱、装备比较、战力推关易于原型化",
            "full_parity_risk": "流派、魂卡、跨服PVP和商业化经济较复杂",
        },
        "confidence": "high",
        "source_ids": ["s1", "s3"],
    },
    {
        "rank": 7,
        "game": "镇邪人",
        "category_on_chart": "角色",
        "monthly_average_rank": 8.0,
        "genre": "中式微恐RPG + 轻量搜打撤 + 放置养成",
        "operator_on_chart": None,
        "replication": {
            "level": "medium-hard",
            "core_mvp": "可实现单地图搜索、自动战斗、撤离和局外升级",
            "full_parity_risk": "内容/美术氛围、英雄养成与商业化运营投入高",
        },
        "confidence": "high",
        "source_ids": ["s1", "s2"],
    },
    {
        "rank": 8,
        "game": "无尽冬日",
        "category_on_chart": "竞技",
        "monthly_average_rank": 8.6,
        "genre": "冰雪生存模拟经营 + 4X SLG",
        "operator_on_chart": "点点互动（北京）科技有限公司",
        "replication": {
            "level": "very-hard",
            "core_mvp": "可做熔炉城建、幸存者分工的单机切片",
            "full_parity_risk": "成熟4X后端、跨服联盟、实时运营及内容规模不可轻量复制",
        },
        "confidence": "high",
        "source_ids": ["s1", "s2", "s3", "s5", "s6"],
    },
    {
        "rank": 9,
        "game": "永远的蔚蓝星球",
        "category_on_chart": "休闲",
        "monthly_average_rank": 9.2,
        "genre": "随机英雄合成 + Roguelike塔防",
        "operator_on_chart": "广州娱悦信息技术有限公司",
        "replication": {
            "level": "medium",
            "core_mvp": "三分钟召唤、合成、守线和随机强化适合独立MVP",
            "full_parity_risk": "英雄池、数值、合作/PVP和长期内容仍需持续投入",
        },
        "confidence": "high",
        "source_ids": ["s1", "s2", "s3"],
    },
    {
        "rank": 10,
        "game": "向往的生活",
        "category_on_chart": "休闲",
        "monthly_average_rank": 11.6,
        "genre": "二合（merge-2）+ 田园建造/模拟经营",
        "operator_on_chart": "深圳市必凡娱乐科技有限公司",
        "replication": {
            "level": "medium",
            "core_mvp": "二合棋盘、任务和场景修复可快速原型化",
            "full_parity_risk": "原作依赖芒果TV综艺授权、内容资产与微信社交沉淀",
        },
        "confidence": "high",
        "source_ids": ["s1", "s3"],
    },
]


IAA_TOP_10 = [
    {"rank": 1, "game": "赵云与阿斗", "monthly_average_rank": 1.0, "genre": "文字拼接 + 塔防"},
    {"rank": 2, "game": "羊了个羊：星球", "monthly_average_rank": 2.0, "genre": "层叠式三槽消除"},
    {"rank": 3, "game": "挪了下车", "monthly_average_rank": 3.3, "genre": "停车/排序解谜"},
    {"rank": 4, "game": "抓大鹅", "monthly_average_rank": 3.7, "genre": "3D找物消除"},
    {"rank": 5, "game": "一找一个准", "monthly_average_rank": 5.2, "genre": "找物解谜"},
    {"rank": 6, "game": "沙画消消", "monthly_average_rank": 6.0, "genre": "沙画排序消除"},
    {"rank": 7, "game": "躺平发育", "monthly_average_rank": 7.5, "genre": "非对称宿舍塔防"},
    {"rank": 8, "game": "挪了个挪", "monthly_average_rank": 8.7, "genre": "挪动/排序解谜"},
    {"rank": 9, "game": "搬砖没我快", "monthly_average_rank": 9.0, "genre": "蚂蚁搬家式排序消除"},
    {"rank": 10, "game": "打个螺丝", "monthly_average_rank": 10.7, "genre": "螺丝拆解/排序解谜"},
]
for row in IAA_TOP_10:
    row.update(
        {
            "replication": {
                "level": (
                    "medium"
                    if row["game"] in {"赵云与阿斗", "抓大鹅", "躺平发育"}
                    else "easy-medium"
                ),
                "note": "核心局内玩法可做原创化Web/Canvas MVP；广告、关卡量和微信传播闭环不在简单复刻范围内",
            },
            "confidence": "high",
            "source_ids": ["s1", "s3"],
        }
    )


HISTORICAL_SNAPSHOTS = [
    {
        "period": "2025-07",
        "series": "GameLook月度统计",
        "metric": "微信小游戏畅销榜",
        "ranks": [
            "向僵尸开炮",
            "三国：冰河时代",
            "无尽冬日",
            "龙迹之城",
            "道友来挖宝",
            "灵画师",
            "跃动小子",
            "寻道大千",
            "雷霆战机",
            "神器传说",
        ],
        "source_ids": ["s9"],
    },
    {
        "period": "2025-12",
        "series": "引力引擎",
        "metric": "微信小游戏畅销榜",
        "coverage": "reported_top_5",
        "ranks": ["三国：冰河时代", "向僵尸开炮", "道友来挖宝", "无尽冬日", "我的花园世界"],
        "source_ids": ["s7"],
    },
    {
        "period": "2025-12",
        "series": "引力引擎",
        "metric": "微信小游戏畅玩榜",
        "coverage": "reported_top_6",
        "ranks": ["羊了个羊：星球", "抓大鹅", "猪了个猪", "套住那只羊", "箭了又箭", "俄罗斯方块拼图"],
        "source_ids": ["s7"],
    },
    {
        "period": "2026-01",
        "series": "DataEye-ADX与引力引擎联合月榜",
        "metric": "微信小游戏畅销榜（主要按IAP，新游有特殊加成）",
        "ranks": [
            "三国：冰河时代",
            "生存33天",
            "向僵尸开炮",
            "无尽冬日",
            "道友来挖宝",
            "我的花园世界",
            "传奇之业",
            "神器传说",
            "跃动小子",
            "灵画师",
        ],
        "source_ids": ["s8"],
    },
]


ALTERNATE_SERIES = {
    "period": "2026-07",
    "series": "GameLook月度统计",
    "metric": "微信小游戏畅销榜",
    "ranks": [
        "我的花园世界",
        "向僵尸开炮",
        "三国：冰河时代",
        "永远的蔚蓝星球",
        "灵画师",
        "无尽冬日",
        "QQ经典农场",
        "斗罗大陆：传承",
        "向往的生活",
        "浪漫餐厅",
    ],
    "source_ids": ["s4"],
    "warning": "统计序列与ADX/引力引擎不同，不应逐位混合；仅作方向性交叉校验。",
}


def build_payload() -> dict[str, Any]:
    return {
        "schema_version": "1.0",
        "generated_at": "2026-08-26T00:00:00Z",
        "scope": "中国大陆微信小游戏，2025-2026公开榜单探针",
        "primary_definition": {
            "period": "2026-07",
            "series": "DataEye-ADX与引力引擎联合月榜",
            "ranking_basis": "月内上榜日排名平均值；畅销榜主要按IAP且新游有较高特殊加成；畅玩榜主要按IAA且新游有加成",
            "selection_reason": "用户指定引力引擎/ADX/36氪，且这是检索时最新完整月榜。",
            "caveats": [
                "畅销榜反映变现/IAP竞争，不等同于玩家口碑或MAU。",
                "畅玩榜与畅销榜商业模型不同，不能合并成单一无权重总榜。",
                "不同媒体/机构的月榜统计窗口与算法不同，本文件保持独立序列。",
                "36氪正文将环比月份写成2026年8月，按发布时间和上下文应为笔误；本文件不使用该环比字段。",
            ],
        },
        "chart_artifacts": {
            "iap_top_20_chart": PRIMARY_CHART_URL,
            "iaa_top_20_chart": IAA_CHART_URL,
        },
        "primary_rankings": {
            "wechat_bestselling_iap_top_10": IAP_TOP_10,
            "wechat_most_played_iaa_top_10": IAA_TOP_10,
        },
        "alternate_series_cross_check": ALTERNATE_SERIES,
        "historical_snapshots": HISTORICAL_SNAPSHOTS,
        "sources": SOURCES,
        "confidence_scale": {
            "high": "排名可由原始榜单图表直接读取，且至少一处正文/镜像交叉印证",
            "medium": "正文提及或单一可信二次来源，但缺少可读原图逐位核验",
            "low": "仅搜索摘要、推断或来源口径不清；不用于主榜",
        },
    }


def normalized_json(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def probe_source() -> None:
    request = urllib.request.Request(PRIMARY_URL, headers={"User-Agent": "Mozilla/5.0 ranking-probe/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        html = response.read().decode("utf-8", "replace")
    expected = ["DataEye与引力引擎联合发布小游戏月榜", "向僵尸开炮", "赵云与阿斗"]
    missing = [text for text in expected if text not in html]
    chart_urls = list(
        dict.fromkeys(re.findall(r'<p class="image-wrapper"><img[^>]+src="([^"]+)', html))
    )
    if missing or PRIMARY_CHART_URL not in chart_urls or IAA_CHART_URL not in chart_urls:
        details = {
            "missing_text": missing,
            "chart_count": len(chart_urls),
            "primary_chart_found": PRIMARY_CHART_URL in chart_urls,
            "iaa_chart_found": IAA_CHART_URL in chart_urls,
        }
        raise RuntimeError(f"source probe failed: {json.dumps(details, ensure_ascii=False)}")
    print(f"source probe ok: {len(chart_urls)} article charts, expected ranking evidence present")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true", help="fail if output differs from generated snapshot")
    parser.add_argument("--probe", action="store_true", help="also verify the live 36氪 source")
    args = parser.parse_args()

    if args.probe:
        probe_source()

    expected = normalized_json(build_payload())
    if args.check:
        if not args.output.exists():
            print(f"missing output: {args.output}", file=sys.stderr)
            return 1
        if args.output.read_text(encoding="utf-8") != expected:
            print(f"snapshot differs: {args.output}", file=sys.stderr)
            return 1
        print(f"snapshot check ok: {args.output}")
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(expected, encoding="utf-8")
    print(f"wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
