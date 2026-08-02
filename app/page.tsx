"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Format = "playerMarket" | "cardMarket" | "playerNews" | "cardNews" | "recentSale" | "biggestGain" | "biggestDecline" | "newRecord" | "collectionChange" | "watchlistAlert" | "populationChange" | "auctionEnding" | "playerMilestone" | "marketComparison" | "collectorsWatching" | "competitionOpportunity";
type Detail = { label: string; value: string };
type Sale = { date: string; price: string; venue: string };

type Story = {
  format: Format;
  kicker: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  accent: string;
  change?: string;
  stat?: string;
  statLabel?: string;
  chart?: number[];
  details: Detail[];
  insight: string;
  chips: string[];
  sales?: Sale[];
  article?: { source: string; published: string; url: string; readTime: string };
  action?: string;
  eyebrow?: string;
};

const stories: Story[] = [
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Victor Wembanyama",
    subtitle: "Basketball · San Antonio · 1,284 cards tracked",
    image: "https://a.espncdn.com/i/headshots/nba/players/full/5104157.png",
    imageAlt: "Victor Wembanyama",
    accent: "#8b5cf6",
    change: "+12.4%",
    stat: "$4.82M",
    statLabel: "Tracked market cap",
    chart: [36, 39, 38, 45, 43, 51, 49, 58, 62, 60, 72, 78],
    details: [
      { label: "30D sales", value: "$1.34M" },
      { label: "Market breadth", value: "84% up" },
      { label: "Avg. sale", value: "$376" },
      { label: "Top category", value: "Prizm RCs" },
    ],
    insight: "Premium rookie cards are driving the move, with strength spread across most tracked Wembanyama markets.",
    chips: ["Trending #1", "Basketball", "High liquidity"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2023 Prizm Silver RC",
    subtitle: "Victor Wembanyama · Card #136 · PSA 10",
    image: "https://a.espncdn.com/i/headshots/nba/players/full/5104157.png",
    imageAlt: "Victor Wembanyama",
    accent: "#1e9e38",
    change: "+18.7%",
    stat: "$1,248",
    statLabel: "Current market estimate",
    details: [
      { label: "Set", value: "2023 Panini Prizm" },
      { label: "Parallel", value: "Silver" },
      { label: "Grade", value: "PSA 10" },
      { label: "30D volume", value: "42 sales" },
    ],
    sales: [
      { date: "Jul 31", price: "$1,275", venue: "Auction" },
      { date: "Jul 28", price: "$1,220", venue: "Best Offer" },
      { date: "Jul 24", price: "$1,249", venue: "Auction" },
    ],
    insight: "The latest three comparable sales are clustered tightly, while 30-day volume remains high for a premium modern card.",
    chips: ["Silver parallel", "PSA 10", "42 sales / 30D"],
  },
  {
    format: "playerNews",
    kicker: "PLAYER NEWS",
    title: "Gronk says collecting is at its “super peak”",
    subtitle: "The former Patriot returns to the hobby at The National",
    image: "https://a.espncdn.com/i/headshots/nfl/players/full/13229.png",
    imageAlt: "Rob Gronkowski",
    accent: "#ef4444",
    details: [
      { label: "Person", value: "Rob Gronkowski" },
      { label: "Event", value: "The National" },
      { label: "Partner", value: "eBay Live" },
      { label: "Topic", value: "Hobby growth" },
    ],
    insight: "Gronkowski is returning to collecting through an eBay Live series and says the hobby has reached a new level of popularity.",
    chips: ["NFL", "Collector culture", "The National"],
    article: {
      source: "New York Post",
      published: "July 27, 2026",
      readTime: "5 min read",
      url: "https://nypost.com/2026/07/27/lifestyle/patriots-legend-rob-gronkowski-returns-to-childhood-hobby-says-its-at-its-super-peak/",
    },
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Shohei Ohtani",
    subtitle: "Baseball · Los Angeles · 2,912 cards tracked",
    image: "https://a.espncdn.com/i/headshots/mlb/players/full/39832.png",
    imageAlt: "Shohei Ohtani",
    accent: "#3b82f6",
    change: "+4.9%",
    stat: "$11.6M",
    statLabel: "Tracked market cap",
    chart: [45, 47, 46, 50, 48, 54, 58, 56, 60, 63, 61, 68],
    details: [
      { label: "30D sales", value: "$2.08M" },
      { label: "Market breadth", value: "67% up" },
      { label: "Avg. sale", value: "$714" },
      { label: "Top category", value: "Chrome Autos" },
    ],
    insight: "Numbered Chrome cards and authenticated autographs are outperforming Ohtani’s broader base-card market.",
    chips: ["Trending #3", "Baseball", "Deep market"],
  },
  {
    format: "cardNews",
    kicker: "CARD NEWS",
    title: "Wemby Prizm Black 1/1 sells for $5.11M",
    subtitle: "A record price for a non-autographed modern NBA card",
    image: "https://a.espncdn.com/i/headshots/nba/players/full/5104157.png",
    imageAlt: "Victor Wembanyama",
    accent: "#f59e0b",
    stat: "$5.11M",
    statLabel: "Reported private sale",
    details: [
      { label: "Card", value: "2023 Prizm Black" },
      { label: "Serial", value: "1 of 1" },
      { label: "Grade", value: "PSA 10" },
      { label: "Sale type", value: "Private deal" },
    ],
    insight: "The reported sale reset Wembanyama’s card record and highlighted the premium placed on his rare non-autographed rookies.",
    chips: ["Record sale", "One-of-one", "Modern basketball"],
    article: {
      source: "Dexerto",
      published: "May 26, 2026",
      readTime: "4 min read",
      url: "https://www.dexerto.com/sports/victor-wembanyama-rookie-card-sells-for-record-5-11m-after-hobby-controversy-3368300/",
    },
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Caitlin Clark",
    subtitle: "Basketball · Indiana · 864 cards tracked",
    image: "https://a.espncdn.com/i/headshots/wnba/players/full/4433403.png",
    imageAlt: "Caitlin Clark",
    accent: "#f59e0b",
    change: "+8.6%",
    stat: "$2.14M",
    statLabel: "Tracked market cap",
    chart: [41,43,42,47,49,46,53,55,58,61,60,67],
    details: [{label:"30D sales",value:"$688K"},{label:"Market breadth",value:"76% up"},{label:"Avg. sale",value:"$294"},{label:"Top category",value:"Prizm RCs"}],
    insight: "Premium rookies and numbered parallels are leading Clark’s market as women’s basketball demand expands.",
    chips: ["Trending #2","Basketball","Rising volume"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2024 Select Gold RC /10",
    subtitle: "Caitlin Clark · Courtside · PSA 10",
    image: "https://a.espncdn.com/i/headshots/wnba/players/full/4433403.png",
    imageAlt: "Caitlin Clark",
    accent: "#f59e0b",
    change: "+11.2%",
    stat: "$8,450",
    statLabel: "Current market estimate",
    details: [{label:"Set",value:"2024 Select"},{label:"Parallel",value:"Gold /10"},{label:"Grade",value:"PSA 10"},{label:"30D volume",value:"3 sales"}],
    sales: [{date:"Jul 30",price:"$8,600",venue:"Auction"},{date:"Jul 12",price:"$8,250",venue:"Private"},{date:"Jun 29",price:"$8,500",venue:"Auction"}],
    insight: "Low serial numbering limits liquidity, but recent results establish a narrow premium-market range.",
    chips: ["Gold /10","PSA 10","Courtside"],
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "LeBron James",
    subtitle: "Basketball · Los Angeles · 4,180 cards tracked",
    image: "https://a.espncdn.com/i/headshots/nba/players/full/1966.png",
    imageAlt: "LeBron James",
    accent: "#8b5cf6",
    change: "+3.1%",
    stat: "$18.9M",
    statLabel: "Tracked market cap",
    chart: [48,47,49,51,50,53,52,55,57,56,58,60],
    details: [{label:"30D sales",value:"$3.24M"},{label:"Market breadth",value:"59% up"},{label:"Avg. sale",value:"$1,088"},{label:"Top category",value:"Chrome RCs"}],
    insight: "LeBron’s market remains deep and liquid, with flagship rookies outperforming later-career releases.",
    chips: ["Basketball","Blue chip","Deep liquidity"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2003 Topps Chrome RC",
    subtitle: "LeBron James · Card #111 · PSA 10",
    image: "https://a.espncdn.com/i/headshots/nba/players/full/1966.png",
    imageAlt: "LeBron James",
    accent: "#8b5cf6",
    change: "+4.4%",
    stat: "$14,800",
    statLabel: "Current market estimate",
    details: [{label:"Set",value:"2003 Topps Chrome"},{label:"Card",value:"#111 Rookie"},{label:"Grade",value:"PSA 10"},{label:"30D volume",value:"18 sales"}],
    sales: [{date:"Jul 29",price:"$14,950",venue:"Auction"},{date:"Jul 21",price:"$14,500",venue:"Best Offer"},{date:"Jul 10",price:"$14,875",venue:"Auction"}],
    insight: "Frequent sales make this one of the clearest benchmarks for LeBron’s flagship rookie market.",
    chips: ["Flagship rookie","PSA 10","High liquidity"],
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Aaron Judge",
    subtitle: "Baseball · New York · 2,206 cards tracked",
    image: "https://a.espncdn.com/i/headshots/mlb/players/full/33192.png",
    imageAlt: "Aaron Judge",
    accent: "#06b6d4",
    change: "+6.8%",
    stat: "$6.72M",
    statLabel: "Tracked market cap",
    chart: [39,42,41,45,48,46,52,54,53,59,62,66],
    details: [{label:"30D sales",value:"$1.11M"},{label:"Market breadth",value:"71% up"},{label:"Avg. sale",value:"$506"},{label:"Top category",value:"Chrome Autos"}],
    insight: "Rookie autographs and numbered refractors are responding fastest to Judge’s on-field momentum.",
    chips: ["Baseball","Power index","Strong breadth"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2017 Topps Chrome Refractor",
    subtitle: "Aaron Judge · Card #169 · PSA 10",
    image: "https://a.espncdn.com/i/headshots/mlb/players/full/33192.png",
    imageAlt: "Aaron Judge",
    accent: "#06b6d4",
    change: "+9.3%",
    stat: "$1,875",
    statLabel: "Current market estimate",
    details: [{label:"Set",value:"2017 Topps Chrome"},{label:"Parallel",value:"Refractor"},{label:"Grade",value:"PSA 10"},{label:"30D volume",value:"24 sales"}],
    sales: [{date:"Jul 31",price:"$1,925",venue:"Auction"},{date:"Jul 25",price:"$1,850",venue:"Best Offer"},{date:"Jul 17",price:"$1,875",venue:"Auction"}],
    insight: "Recent sales show consistent demand with limited price dispersion across major marketplaces.",
    chips: ["Refractor","PSA 10","24 sales / 30D"],
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Patrick Mahomes",
    subtitle: "Football · Kansas City · 2,744 cards tracked",
    image: "https://a.espncdn.com/i/headshots/nfl/players/full/3139477.png",
    imageAlt: "Patrick Mahomes",
    accent: "#ef4444",
    change: "+2.7%",
    stat: "$9.38M",
    statLabel: "Tracked market cap",
    chart: [50,49,51,50,53,55,54,57,56,59,60,62],
    details: [{label:"30D sales",value:"$1.74M"},{label:"Market breadth",value:"56% up"},{label:"Avg. sale",value:"$812"},{label:"Top category",value:"Prizm RCs"}],
    insight: "Mahomes remains football’s deepest modern market, led by scarce rookies and premium autographs.",
    chips: ["Football","Blue chip","Deep liquidity"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2017 Prizm Silver RC",
    subtitle: "Patrick Mahomes · Card #269 · PSA 10",
    image: "https://a.espncdn.com/i/headshots/nfl/players/full/3139477.png",
    imageAlt: "Patrick Mahomes",
    accent: "#ef4444",
    change: "+3.8%",
    stat: "$11,200",
    statLabel: "Current market estimate",
    details: [{label:"Set",value:"2017 Panini Prizm"},{label:"Parallel",value:"Silver"},{label:"Grade",value:"PSA 10"},{label:"30D volume",value:"11 sales"}],
    sales: [{date:"Jul 28",price:"$11,400",venue:"Auction"},{date:"Jul 16",price:"$10,950",venue:"Private"},{date:"Jul 03",price:"$11,250",venue:"Auction"}],
    insight: "A small but regular sales cadence continues to anchor the premium Mahomes rookie market.",
    chips: ["Silver rookie","PSA 10","Premium football"],
  },
  {
    format: "playerMarket",
    kicker: "PLAYER MARKET",
    title: "Connor McDavid",
    subtitle: "Hockey · Edmonton · 1,506 cards tracked",
    image: "https://a.espncdn.com/i/headshots/nhl/players/full/3895074.png",
    imageAlt: "Connor McDavid",
    accent: "#3b82f6",
    change: "+5.5%",
    stat: "$4.26M",
    statLabel: "Tracked market cap",
    chart: [43,45,44,48,47,52,50,55,57,56,61,64],
    details: [{label:"30D sales",value:"$782K"},{label:"Market breadth",value:"64% up"},{label:"Avg. sale",value:"$519"},{label:"Top category",value:"Young Guns"}],
    insight: "Young Guns rookies and premium Cup releases continue to define McDavid’s hockey market.",
    chips: ["Hockey","Young Guns","Global demand"],
  },
  {
    format: "cardMarket",
    kicker: "CARD MARKET",
    title: "2015 Upper Deck Young Guns",
    subtitle: "Connor McDavid · Card #201 · PSA 10",
    image: "https://a.espncdn.com/i/headshots/nhl/players/full/3895074.png",
    imageAlt: "Connor McDavid",
    accent: "#3b82f6",
    change: "+7.1%",
    stat: "$3,950",
    statLabel: "Current market estimate",
    details: [{label:"Set",value:"2015 Upper Deck"},{label:"Card",value:"#201 Young Guns"},{label:"Grade",value:"PSA 10"},{label:"30D volume",value:"29 sales"}],
    sales: [{date:"Jul 30",price:"$4,050",venue:"Auction"},{date:"Jul 23",price:"$3,875",venue:"Best Offer"},{date:"Jul 14",price:"$3,925",venue:"Auction"}],
    insight: "High sales frequency makes the Young Guns PSA 10 the central benchmark for McDavid collectors.",
    chips: ["Young Guns","PSA 10","29 sales / 30D"],
  },
  {
    format:"recentSale", kicker:"RECENT SALE", title:"Ohtani Gold Refractor closes at $18,250", subtitle:"2018 Bowman Chrome · Gold /50 · PSA 10", image:"https://a.espncdn.com/i/headshots/mlb/players/full/39832.png", imageAlt:"Shohei Ohtani", accent:"#22c55e", stat:"$18,250", statLabel:"Verified sale · 11 minutes ago", change:"+9.6% vs last comp", details:[{label:"Venue",value:"Goldin"},{label:"Bids",value:"27"},{label:"Previous",value:"$16,650"},{label:"Confidence",value:"High"}], insight:"The result is the highest verified public sale for this grade in 90 days.", chips:["Verified","Gold /50","Fresh comp"], action:"View sale"
  },
  {
    format:"biggestGain", kicker:"BIGGEST GAIN", title:"Caleb Williams rookie market surges", subtitle:"Top mover across football cards today", image:"https://a.espncdn.com/i/headshots/nfl/players/full/4431611.png", imageAlt:"Caleb Williams", accent:"#39e06f", stat:"+24.8%", statLabel:"24-hour player index", change:"↑ #1 mover", chart:[31,32,34,33,38,41,43,49,55,61,68,76], details:[{label:"Cards rising",value:"86%"},{label:"Volume",value:"+41%"},{label:"Top card",value:"Prizm Silver"},{label:"Sales",value:"184"}], insight:"The move is broad-based, with both base rookies and numbered parallels participating.", chips:["Daily leader","Football","High breadth"], action:"Track player"
  },
  {
    format:"biggestDecline", kicker:"BIGGEST DECLINE", title:"Anthony Richardson gives back recent gains", subtitle:"Largest 24-hour decline among tracked football players", image:"https://a.espncdn.com/i/headshots/nfl/players/full/4429084.png", imageAlt:"Anthony Richardson", accent:"#ff4d5e", stat:"−16.3%", statLabel:"24-hour player index", change:"↓ #1 decline", chart:[74,72,70,69,64,66,58,55,49,46,41,38], details:[{label:"Cards down",value:"79%"},{label:"Volume",value:"+18%"},{label:"Floor",value:"$42"},{label:"Sales",value:"126"}], insight:"Selling is concentrated in high-population base rookies; scarce parallels are holding better.", chips:["Price alert","Football","Risk"], action:"Review market"
  },
  {
    format:"newRecord", kicker:"NEW RECORD", title:"Jordan rookie sets a new PSA 10 high", subtitle:"1986 Fleer #57 · Michael Jordan · PSA 10", image:"https://a.espncdn.com/i/headshots/nba/players/full/1035.png", imageAlt:"Michael Jordan", accent:"#f5b942", stat:"$910K", statLabel:"New all-time high", change:"+$70K over prior record", details:[{label:"Auction",value:"Heritage"},{label:"Bidders",value:"19"},{label:"Prior high",value:"$840K"},{label:"Grade",value:"PSA 10"}], insight:"The sale establishes a new public benchmark for the hobby’s most recognized basketball rookie.", chips:["All-time high","Vintage","Record"], action:"See record"
  },
  {
    format:"collectionChange", kicker:"YOUR COLLECTION", title:"Your collection gained $184 today", subtitle:"7 of your 12 tracked cards moved in value", image:"https://a.espncdn.com/i/headshots/wnba/players/full/4433403.png", imageAlt:"Caitlin Clark", accent:"#7c6cff", stat:"+$184", statLabel:"Today’s collection change", change:"+3.7%", details:[{label:"Current value",value:"$5,126"},{label:"Biggest gain",value:"+$96"},{label:"Cards up",value:"7"},{label:"Cards down",value:"2"}], insight:"Your Caitlin Clark Select Courtside accounted for more than half of today’s increase.", chips:["Personal","Collection","Daily recap"], action:"View collection"
  },
  {
    format:"watchlistAlert", kicker:"WATCHLIST ALERT", title:"Mahomes Silver crosses your target", subtitle:"2017 Prizm Silver RC · PSA 10", image:"https://a.espncdn.com/i/headshots/nfl/players/full/3139477.png", imageAlt:"Patrick Mahomes", accent:"#ff7139", stat:"$10,950", statLabel:"Latest verified sale", change:"Below $11K target", details:[{label:"Your target",value:"$11,000"},{label:"Discount",value:"−6.1%"},{label:"Listed",value:"8 cards"},{label:"Liquidity",value:"High"}], insight:"This is the first verified sale below your target price in 47 days.", chips:["Watchlist","Target hit","PSA 10"], action:"Review card"
  },
  {
    format:"populationChange", kicker:"POPULATION CHANGE", title:"Wemby PSA 10 population rises quickly", subtitle:"2023 Prizm Base #136 · PSA grading report", image:"https://a.espncdn.com/i/headshots/nba/players/full/5104157.png", imageAlt:"Victor Wembanyama", accent:"#26c6da", stat:"+214", statLabel:"New PSA 10 copies · 30D", change:"+8.2% supply", details:[{label:"PSA 10 pop",value:"2,824"},{label:"Gem rate",value:"63%"},{label:"Submitted",value:"339"},{label:"Price impact",value:"−4.1%"}], insight:"Supply is growing faster than sales volume, increasing downward pressure on base-card prices.", chips:["PSA pop","Supply","Risk signal"], action:"View population"
  },
  {
    format:"auctionEnding", kicker:"ENDING SOON", title:"LeBron Chrome rookie has 06:42 left", subtitle:"2003 Topps Chrome #111 · PSA 10", image:"https://a.espncdn.com/i/headshots/nba/players/full/1966.png", imageAlt:"LeBron James", accent:"#ff3b7f", stat:"06:42", statLabel:"Time remaining", change:"$13,750 current bid", details:[{label:"Bids",value:"31"},{label:"Market value",value:"$14,800"},{label:"Buyer premium",value:"20%"},{label:"Watching",value:"146"}], insight:"The current bid is 7.1% below the recent market estimate before buyer’s premium.", chips:["Live auction","Ending soon","146 watching"], action:"Open auction"
  },
  {
    format:"playerMilestone", kicker:"PLAYER MILESTONE", title:"Aaron Judge reaches 500 career home runs", subtitle:"Milestone moment · Card market reaction", image:"https://a.espncdn.com/i/headshots/mlb/players/full/33192.png", imageAlt:"Aaron Judge", accent:"#00a8ff", stat:"500", statLabel:"Career home runs", change:"+12.1% card interest", details:[{label:"Search volume",value:"+48%"},{label:"Card sales",value:"+33%"},{label:"Top mover",value:"2017 Chrome"},{label:"Mentions",value:"18.4K"}], insight:"Collector attention spiked immediately, with rookie refractors receiving the strongest demand.", chips:["Milestone","Baseball","Market reaction"], action:"Explore Judge"
  },
  {
    format:"marketComparison", kicker:"MARKET COMPARISON", title:"Ohtani vs. Judge", subtitle:"30-day baseball card market performance", image:"https://a.espncdn.com/i/headshots/mlb/players/full/39832.png", imageAlt:"Shohei Ohtani", accent:"#a78bfa", stat:"+7.8%", statLabel:"Ohtani 30-day return", change:"Judge +6.8%", chart:[42,44,43,48,49,53,52,57,61,60,65,69], details:[{label:"Market cap",value:"$11.6M / $6.7M"},{label:"Sales",value:"2,912 / 2,206"},{label:"Avg sale",value:"$714 / $506"},{label:"Leader",value:"Ohtani"}], insight:"Ohtani leads on return, market size, and average sale; Judge is generating faster volume growth.", chips:["Head-to-head","Baseball","30 days"], action:"Compare markets"
  },
  {
    format:"collectorsWatching", kicker:"COLLECTOR RADAR", title:"Collectors are watching Cooper Flagg", subtitle:"Fastest-growing watchlist adds this week", image:"https://a.espncdn.com/i/headshots/nba/players/full/5041939.png", imageAlt:"Cooper Flagg", accent:"#e879f9", stat:"+2,841", statLabel:"New collector watchlists", change:"+68% this week", details:[{label:"Rank",value:"#1 watched"},{label:"Top card",value:"Prizm RC"},{label:"Avg budget",value:"$425"},{label:"Sentiment",value:"89% bullish"}], insight:"Interest is building before deep sales history exists, making early pricing more volatile.", chips:["Community signal","Prospect","Trending"], action:"Follow trend"
  },
  {
    format:"competitionOpportunity", kicker:"COMPETITION OPPORTUNITY", title:"McDavid is outperforming your portfolio", subtitle:"Free Entry 115 · 4 days remaining", image:"https://a.espncdn.com/i/headshots/nhl/players/full/3895074.png", imageAlt:"Connor McDavid", accent:"#1e9e38", stat:"+5.5%", statLabel:"McDavid · 30-day market", change:"+3.4% vs your portfolio", details:[{label:"Available cards",value:"14"},{label:"Your cash",value:"$1,240"},{label:"Top card",value:"Young Guns"},{label:"Rank",value:"#18"}], insight:"Adding McDavid would increase hockey exposure from 0% to 12% while targeting the competition’s strongest category.", chips:["For your lineup","4 days left","Hockey"], action:"Open trade window"
  }
];

const defaultStories = [
  stories[0], stories[2], stories[3], stories[5], stories[7],
  stories[9], stories[11], stories[13], stories[1], stories[6],
  stories[8], stories[10], stories[12], stories[14], stories[4],
  stories[15], stories[16], stories[17], stories[18], stories[19], stories[20],
  stories[21], stories[22], stories[23], stories[24], stories[25], stories[26],
];

function shuffleWithoutAdjacentPlayers(items: Story[]) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    const hasRepeat = shuffled.some((story, index) => index > 0 && story.imageAlt === shuffled[index - 1].imageAlt);
    if (!hasRepeat) return shuffled;
  }
  return defaultStories;
}

function PulseLogo() {
  return <div className="logo" aria-label="Card Madness Pulse"><span className="logo-mark">CM</span><span>PULSE</span></div>;
}

function MarketLineChart({ values }: { values: number[] }) {
  const width = 280;
  const height = 86;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => [
    (index / (values.length - 1)) * width,
    height - 8 - ((value - min) / range) * (height - 18),
  ] as const);
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = points.at(-1)!;
  return (
    <div className="player-chart" aria-label="30-day player market trend">
      <div className="chart-top"><span>30 DAY MARKET TREND</span><b>LIVE</b></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs><linearGradient id="player-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".32"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
        <path className="grid-line" d={`M0,${height * .33}H${width} M0,${height * .66}H${width}`}/>
        <path className="chart-area" d={area} fill="url(#player-area)"/>
        <path className="chart-line" d={line}/>
        <circle className="chart-dot" cx={last[0]} cy={last[1]} r="3"/>
      </svg>
      <div className="chart-axis"><span>30D AGO</span><span>TODAY</span></div>
    </div>
  );
}

function DetailGrid({ details }: { details: Detail[] }) {
  return <div className="detail-grid">{details.map((detail) => <div key={detail.label}><span>{detail.label}</span><strong>{detail.value}</strong></div>)}</div>;
}

function PlayerMarket({ story }: { story: Story }) {
  return (
    <div className="format-body player-market">
      <div className="market-summary"><div><strong>{story.stat}</strong><span>{story.statLabel}</span></div><b>{story.change}</b></div>
      <MarketLineChart values={story.chart!}/>
      <DetailGrid details={story.details}/>
      <p className="insight">{story.insight}</p>
    </div>
  );
}

function CardMarket({ story }: { story: Story }) {
  return (
    <div className="format-body card-market">
      <div className="card-price"><span>CURRENT ESTIMATE</span><strong>{story.stat}</strong><b>{story.change} · 30D</b></div>
      <DetailGrid details={story.details}/>
      <div className="sales-table"><div className="sales-head"><span>RECENT COMPARABLE SALES</span><small>Date · venue · price</small></div>{story.sales!.map((sale) => <div className="sale-row" key={`${sale.date}-${sale.price}`}><span>{sale.date}</span><span>{sale.venue}</span><strong>{sale.price}</strong></div>)}</div>
      <p className="insight">{story.insight}</p>
    </div>
  );
}

function PlayerNews({ story }: { story: Story }) {
  return (
    <div className="format-body player-news">
      <div className="news-byline"><span>{story.article!.source}</span><i/> <span>{story.article!.published}</span><i/> <span>{story.article!.readTime}</span></div>
      <p className="news-dek">{story.insight}</p>
      <DetailGrid details={story.details}/>
      <a className="article-button" href={story.article!.url} target="_blank" rel="noreferrer">Read full article <span>↗</span></a>
    </div>
  );
}

function CardNews({ story }: { story: Story }) {
  return (
    <div className="format-body card-news">
      <div className="record-sale"><span>REPORTED SALE</span><strong>{story.stat}</strong><small>{story.statLabel}</small></div>
      <div className="card-news-specs"><DetailGrid details={story.details}/></div>
      <p className="news-dek">{story.insight}</p>
      <div className="source-row"><div><span>SOURCE</span><strong>{story.article!.source}</strong><small>{story.article!.published}</small></div><a href={story.article!.url} target="_blank" rel="noreferrer">Read sale report ↗</a></div>
    </div>
  );
}

function SignalStory({ story }: { story: Story }) {
  const isDirectional = story.format === "biggestGain" || story.format === "biggestDecline";
  const showChart = isDirectional || story.format === "marketComparison";
  return (
    <div className={`format-body signal-body signal-${story.format}`}>
      <div className="signal-hero">
        <span>{story.statLabel}</span>
        <strong>{story.stat}</strong>
        <b>{story.change}</b>
      </div>
      {showChart && story.chart ? <MarketLineChart values={story.chart}/> : null}
      {story.format === "auctionEnding" ? <div className="countdown-track"><i/><span>LIVE BIDDING</span></div> : null}
      {story.format === "marketComparison" ? <div className="versus"><b>OHTANI</b><span>VS</span><b>JUDGE</b></div> : null}
      <DetailGrid details={story.details}/>
      <p className="insight">{story.insight}</p>
      <button className="signal-action">{story.action} <span>→</span></button>
    </div>
  );
}

function StoryContent({ story }: { story: Story }) {
  if (story.format === "playerMarket") return <PlayerMarket story={story}/>;
  if (story.format === "cardMarket") return <CardMarket story={story}/>;
  if (story.format === "playerNews") return <PlayerNews story={story}/>;
  if (story.format === "cardNews") return <CardNews story={story}/>;
  return <SignalStory story={story}/>;
}

function StoryCard({ story, index, saved, onSave }: { story: Story; index: number; saved: boolean; onSave: () => void }) {
  const isNews = story.format === "playerNews" || story.format === "cardNews";
  const cardFormats: Format[] = ["cardMarket","cardNews","recentSale","newRecord","watchlistAlert","populationChange","auctionEnding"];
  const isCard = cardFormats.includes(story.format);
  return (
    <article className={`story format-${story.format}`} style={{ "--accent": story.accent } as React.CSSProperties}>
      <header className="topbar"><PulseLogo/><div className="top-actions"><button aria-label="Search">⌕</button><button aria-label="Notifications">●</button></div></header>
      <div className="story-image" aria-hidden="true">
        <div className={`image-frame ${isCard ? "card-render" : ""}`}>
          {isCard ? (
            <>
              <div className="slab-label"><b>PSA</b><span>GEM MT</span><strong>10</strong></div>
              <div className="card-art">
                <Image src={story.image} alt={story.imageAlt} fill sizes="(max-width: 799px) 32vw, 22vw" priority={index === 0}/>
                <div className="card-foil"/>
                <div className="card-nameplate"><strong>{story.imageAlt}</strong><span>{story.title}</span></div>
              </div>
            </>
          ) : (
            <><Image src={story.image} alt={story.imageAlt} fill sizes="(max-width: 799px) 60vw, 32vw" priority={index === 0}/><div className="photo-shade"/><span className="photo-name">{story.imageAlt}</span></>
          )}
          <span className="edition">0{index + 1}</span>
        </div>
        <span className={`format-pill ${isNews ? "editorial" : "market"}`}>{isNews ? "EDITORIAL" : story.kicker}</span>
      </div>
      <section className="story-content">
        <p className="kicker"><i/>{story.kicker}</p>
        <h1>{story.title}</h1>
        <p className="subtitle">{story.subtitle}</p>
        <StoryContent story={story}/>
        <div className="chips">{story.chips.map((chip) => <span key={chip}>{chip}</span>)}</div>
      </section>
      <aside className="rail" aria-label="Story actions"><button onClick={onSave} className={saved ? "active" : ""} aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}><b>{saved ? "★" : "☆"}</b><span>{saved ? "Saved" : "Watch"}</span></button><button aria-label="Share story"><b>↗</b><span>Share</span></button></aside>
      <div className="swipe-hint"><span>↑</span> Swipe for next pulse</div>
    </article>
  );
}

export default function Home() {
  const [saved, setSaved] = useState<number[]>([]);
  const [active, setActive] = useState(0);
  const [orderedStories, setOrderedStories] = useState(defaultStories);
  const feedRef = useRef<HTMLElement>(null);
  useEffect(() => {
    setOrderedStories(shuffleWithoutAdjacentPlayers(stories));
    const feed = feedRef.current;
    if (!feed) return;
    const onScroll = () => setActive(Math.round(feed.scrollTop / feed.clientHeight));
    feed.addEventListener("scroll", onScroll, { passive: true });
    return () => feed.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <main className="app-shell">
      <nav className="desktop-nav"><PulseLogo/><div><button className="selected">For You</button><button>Players</button><button>Cards</button><button>News</button></div><button className="profile">JS</button></nav>
      <section className="feed" ref={feedRef} aria-label="Pulse market feed">{orderedStories.map((story, index) => <StoryCard key={story.title} story={story} index={index} saved={saved.includes(index)} onSave={() => setSaved((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])}/>)}</section>
      <div className="progress" aria-label={`Story ${active + 1} of ${orderedStories.length}`}>{orderedStories.map((_, index) => <button key={index} className={active === index ? "active" : ""} onClick={() => feedRef.current?.scrollTo({ top:index * (feedRef.current?.clientHeight ?? 0), behavior:"smooth" })} aria-label={`Go to story ${index + 1}`}/>)}</div>
      <footer className="mobile-nav"><button className="active"><b>⌁</b><span>Pulse</span></button><button><b>◎</b><span>Compete</span></button><button><b>▣</b><span>Collection</span></button><button><b>◇</b><span>Shop</span></button><button><b>○</b><span>Profile</span></button></footer>
    </main>
  );
}
