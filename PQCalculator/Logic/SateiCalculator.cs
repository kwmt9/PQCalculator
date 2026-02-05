using PQCalculator.Model;
using System.Reflection.Emit;

namespace PQCalculator.Logic {
	public class SateiCalculator {
		public struct SateiInfo {
			public string Label { get; set; }
			public double Score { get; set; }
			public PQAbility Ability { get; set; }

			public SateiInfo(string label, double score, PQAbility ability = null) {
				Label = label;
				Score = score;
				Ability = ability;
			}
		}

		public static (List<SateiInfo> sateiInfos, double score) SumPlayerBase_DeckScore(PQPlayerUnit unit, List<PQAbility> AllAbilities, UnitFielderStatus DeckLimit, UnitFielderStatus InputStatus, UnitPitcherStatus DeckPitcherLimit, UnitPitcherStatus InputPitcherStatus, List<List<PQAbility>> deckAbilites, bool isBench,int SelectedSubpos,int level, bool fmax = false, bool pmax = false) {
			List<SateiInfo> sateiInfos = new();

			double score = 0;
			float mulutiply = 1;

			if (unit.Position == 1) {
				mulutiply = 1f / 5f;

				//弾道の査定
				sateiInfos.AddRange(CalucScoreByDandou(unit.Status.Dandou, mulutiply));
				//デッキの上限とキャラの能力を合わせた査定
				Console.WriteLine(fmax ? 50 : Math.Min(DeckLimit.Meet, 50));
				sateiInfos.AddRange(CalucScoreByStatusFielder((fmax ? 50 : Math.Min(DeckLimit.Meet, 50)) + InputStatus.Meet, mulutiply, label: "ミート"));
				sateiInfos.AddRange(CalucScoreByStatusFielder((fmax ? 50 : Math.Min(DeckLimit.Power, 50)) + InputStatus.Power, mulutiply, label: "パワー"));
				sateiInfos.AddRange(CalucScoreByStatusFielder((fmax ? 50 : Math.Min(DeckLimit.RunPower, 50)) + InputStatus.RunPower, mulutiply, label: "走力"));
				sateiInfos.AddRange(CalucScoreByStatusFielder((fmax ? 50 : Math.Min(DeckLimit.ShoulderPower, 50)) + InputStatus.ShoulderPower, mulutiply, label: "肩力"));
				sateiInfos.AddRange(CalucScoreByStatusFielder((fmax ? 50 : Math.Min(DeckLimit.Fielding, 50)) + InputStatus.Fielding, mulutiply, label: "守備力"));
				sateiInfos.AddRange(CalucScoreByStatusFielder((fmax ? 50 : Math.Min(DeckLimit.Catching, 50)) + InputStatus.Catching, mulutiply, label: "捕球"));

				mulutiply = 1;

				sateiInfos.AddRange(CalucScoreByStatusSpeed((pmax ? 50 : Math.Min(DeckPitcherLimit.BallSpeed, 50)) +  InputPitcherStatus.BallSpeed, !isBench ? mulutiply : 1f / 2f));
				sateiInfos.AddRange(CalucScoreByStatusPitcher((pmax ? 50 : Math.Min(DeckPitcherLimit.BallControl, 50)) + InputPitcherStatus.BallControl, !isBench ? mulutiply : 1f / 2f, label: "コントロール"));
				sateiInfos.AddRange(CalucScoreByStatusPitcher((pmax ? 50 : Math.Min(DeckPitcherLimit.Stamina, 50)) + InputPitcherStatus.Stamina, !isBench ? mulutiply : 1f / 2f, label: "スタミナ"));
				sateiInfos.AddRange(CalucScoreByCurves(unit.Curves, pmax,level,!isBench ? mulutiply : 1f / 2f));
			}
			else {
				float fieldDeclineRate = 1f;
				if (SelectedSubpos == 0) {
					fieldDeclineRate = 0.7f;
				}
				else if (SelectedSubpos == 1) {
					fieldDeclineRate = 0.8f;
				}
				else if (SelectedSubpos == 2) {
					fieldDeclineRate = 1f;
				}

				sateiInfos.AddRange(CalucScoreByDandou(unit.Status.Dandou, !isBench ? mulutiply : 1f / 5f));

				sateiInfos.AddRange(CalucScoreByStatusFielder((fmax ? 50 : Math.Min(DeckLimit.Meet, 50)) + InputStatus.Meet, !isBench ? mulutiply : 1f / 5f, label: "ミート"));
				sateiInfos.AddRange(CalucScoreByStatusFielder((fmax ? 50 : Math.Min(DeckLimit.Power, 50)) + InputStatus.Power, !isBench ? mulutiply : 1f / 5f, label: "パワー"));
				sateiInfos.AddRange(CalucScoreByStatusFielder((fmax ? 50 : Math.Min(DeckLimit.RunPower, 50)) + InputStatus.RunPower, !isBench ? mulutiply : 2f / 5f, label: "走力"));
				sateiInfos.AddRange(CalucScoreByStatusFielder((fmax ? 50 : Math.Min(DeckLimit.ShoulderPower, 50)) + InputStatus.ShoulderPower, !isBench ? mulutiply : 1f / 5f, label: "肩力"));
				sateiInfos.AddRange(CalucScoreByStatusFielder((int)Math.Floor((fmax ? 50 : Math.Min(DeckLimit.Fielding, 50)) * fieldDeclineRate) + InputStatus.Fielding, !isBench ? mulutiply : 1f / 5f, label: "守備力"));
				sateiInfos.AddRange(CalucScoreByStatusFielder((fmax ? 50 : Math.Min(DeckLimit.Catching, 50)) + InputStatus.Catching, !isBench ? mulutiply : 1f / 5f, label: "捕球"));
			}
			//キャラの能力と、コーチの能力を合わせて上位のみにする。
			List<PQAbility> abilities = new();
			abilities.AddRange(unit.Abilities);
			abilities.AddRange(deckAbilites.SelectMany(x => x));
			abilities = abilities.GroupBy(a => a.GroupId)
				.Select(g => g.OrderByDescending(a => a.Rank).First())
				.ToList();
			//特殊能力の計算
			sateiInfos.AddRange(CalucScoreByAbility(unit, AllAbilities, isBench, abilities.ToArray()));

			foreach (var sateiInfo in sateiInfos) {
				score += sateiInfo.Score;
			}
			return (sateiInfos,score);
		}
		public static double EvaluateDeckStatusScore(int position , UnitFielderStatus fstatus, UnitPitcherStatus pstatus, UnitFielderStatus flimit, UnitPitcherStatus plimit) {
			List<SateiInfo> sateiInfos = new();
			sateiInfos.AddRange(CalucScoreByStatusFielder(fstatus.Meet + Math.Min(flimit.Meet, 50)));
			sateiInfos.AddRange(CalucScoreByStatusFielder(fstatus.Power + Math.Min(flimit.Power, 50)));
			sateiInfos.AddRange(CalucScoreByStatusFielder(fstatus.RunPower + Math.Min(flimit.RunPower, 50)));
			sateiInfos.AddRange(CalucScoreByStatusFielder(fstatus.ShoulderPower + Math.Min(flimit.ShoulderPower, 50)));
			sateiInfos.AddRange(CalucScoreByStatusFielder(fstatus.Fielding + Math.Min(flimit.Fielding, 50)));
			sateiInfos.AddRange(CalucScoreByStatusFielder(fstatus.Catching + Math.Min(flimit.Catching, 50)));
			if (position == 1) {
				//sateiInfos.AddRange(CalucScoreByStatusSpeed(50 + pstatus.BallSpeed));
				sateiInfos.AddRange(CalucScoreByStatusFielder(pstatus.BallControl + Math.Min(plimit.BallControl, 50)));
				sateiInfos.AddRange(CalucScoreByStatusFielder(pstatus.Stamina + Math.Min(plimit.Stamina, 50)));
			}
			double score = 0;
			foreach (var sateiInfo in sateiInfos) {
				score += sateiInfo.Score;
			}
			return score;
		}
		public static List<PQAbility> SumLowRankSatei(List<PQAbility> pqAbilityes) {
			List<PQAbility> ret = new();

			foreach (var item in pqAbilityes) {
				//下位込みで査定を計算
				var someGroups = pqAbilityes.Where(x => x.GroupId == item.GroupId && 0 < x.Rank && x.Rank <= item.Rank);

				var sumSatei = someGroups.Sum(x => x.SateiMain);
				var sumSateiSub = someGroups.Sum(x => x.SateiSub);
				var sumPF = someGroups.Sum(x => x.PF);
				var sumFP = someGroups.Sum(x => x.FP);

				ret.Add(new PQAbility(item.Id, item.Name, item.ColorType, item.PlayerType, item.GroupId, item.Rank, sumSatei, sumSateiSub, sumPF, sumFP));
			}
			return ret;
		}

		public static List<SateiInfo> CalucScoreByAbility(PQPlayerUnit PQPlayerUnit,List<PQAbility> PQAbilitys, bool isBench, params PQAbility[] unitAbilitys) {
			List<SateiInfo> sateiInfos = new();
			//上位以下の査定を足す
			var sumed = SumLowRankSatei(PQAbilitys);

			var sateiAbilitys = unitAbilitys
			.Select(x => sumed.FirstOrDefault(c => c.Id == x.Id))
			.Where(x => x != null);
			foreach (var ability in sateiAbilitys) {
				//ベンチのときサブ、メイン
				int satei = isBench ? (int)ability.SateiSub : (int)ability.SateiMain;
				//野手の投手能力、投手の野手能力
				int type = PQPlayerUnit.Position == 1 ? 2 : 1;
				if (ability.PlayerType != type) {
					satei = type == 1 ? (int)ability.PF : (int)ability.FP;
				}
				if (satei != 0) {
					sateiInfos.Add(new SateiInfo($"{ability.Name}", satei, ability));
				}
			}
			//直書きしたろ
			var t = unitAbilitys.FirstOrDefault(x => x.Name == "調子安定");
			if (t != null) {
				int satei;
				if (PQPlayerUnit.Position == 1) {
					satei = isBench ? 3 : 6;
				}
				else {
					satei = isBench ? 4 : 15;
				}
				sateiInfos.Add(new SateiInfo($"{t.Name}", satei, t));
			}
			//
			return sateiInfos;
		}
		public static List<SateiInfo> CalucScoreByStatusFielder(int status, float multiplier = 1, string label = "") {
			List<SateiInfo> sateiInfos = new();
			int score = 0;
			int input = status;

			int baseScore = 5;

			if (input >= 101) {
				score += (105 - baseScore);
			}
			if (input >= 90) {
				score += (55 - baseScore);
			}
			if (input >= 80) {
				score += (55 - baseScore);
			}
			if (input >= 70) {
				score += (30 - baseScore);
			}
			if (input >= 60) {
				score += (15 - baseScore);
			}
			if (input >= 50) {
				score += (15 - baseScore);
			}
			if (input >= 40) {
				score += (10 - baseScore);
			}
			score += baseScore * input;
			//1分
			score -= (baseScore);
			//0→1の査定
			score += baseScore;

			score = (int)Math.Floor(score * multiplier);
			sateiInfos.Add(new SateiInfo($"{label}({input})", score));
			//Console.WriteLine(score);
			return sateiInfos;
		}
		public static List<SateiInfo> CalucScoreByStatusPitcher(int status, float multiplier = 1, string label = "") {
			List<SateiInfo> sateiInfos = new();
			int score = 0;
			int input = status;

			int baseScore = 6;

			if (input >= 101) {
				score += (126 - baseScore);
			}
			if (input >= 90) {
				score += (66 - baseScore);
			}
			if (input >= 80) {
				score += (66 - baseScore);
			}
			if (input >= 70) {
				score += (36 - baseScore);
			}
			if (input >= 60) {
				score += (18 - baseScore);
			}
			if (input >= 50) {
				score += (18 - baseScore);
			}
			if (input >= 40) {
				score += (12 - baseScore);
			}
			score += baseScore * input;
			//1分
			score -= (baseScore);
			//0→1の査定
			score += baseScore;

			score = (int)Math.Floor(score * multiplier);

			sateiInfos.Add(new SateiInfo($"{label}({input})", score));
			//Console.WriteLine(score);
			return sateiInfos;
		}
		public static List<SateiInfo> CalucScoreByStatusSpeed(int status, float multiplier = 1) {
			List<SateiInfo> sateiInfos = new();
			int score = 0;
			int SPEED_MAX = 190;
			int SPEED_START = 100;
			int input = Math.Min(status, SPEED_MAX);

			int baseScore = 12;

			if (input >= 181) {
			
			}
			if (input >= 171) {
				score += (132 - baseScore);
			}
			if (input >= 156) {
				score += (72 - baseScore);
			}
			if (input >= 152) {
				score += (72 - baseScore);
			}
			if (input >= 148) {
				score += (42 - baseScore);
			}
			if (input >= 144) {
				score += (24 - baseScore);
			}
			if (input >= 141) {
				score += (24 - baseScore);
			}
			if (input >= 138) {
				score += (18 - baseScore);
			}
			//100から190までまとめて+baseScoreする。
			score += baseScore * (input - SPEED_START);
			score -= (baseScore);
			//0→1の査定
			score += baseScore;

			score = (int)Math.Floor(score * multiplier);
			sateiInfos.Add(new SateiInfo($"球速({input})", score));

			//Console.WriteLine($"{input} {score}");
			return sateiInfos;
		}
		public static List<SateiInfo> CalucScoreByDandou(int statsu, float mulutiply = 1) {
			List<SateiInfo> sateiInfos = new();
			int score = (statsu - 1) * 50;
			score = (int)Math.Floor(score * mulutiply);

			sateiInfos.Add(new SateiInfo($"弾道({statsu})", score));
			return sateiInfos;
		}
		public static List<SateiInfo> CalucScoreByCurves(List<UnitStatusCurveBall> curves, bool pmax, int level, float multiplier = 1) {
			List<SateiInfo> sateiInfos = new();
			int score = 0;
			int count = 0;
			if (pmax) {
				foreach (var curve in curves) {
					if (curve.Amount != 0)
						count += 7;
				}
			}
			else {
				foreach (var curve in curves) {
					if (curve.Amount != 0)
						count += curve.Amount;
				}
				count = CoachCaluclator.CalucStatusFromLevel(level,count);
			}
			score = count * 24;
			score = (int)Math.Floor(score * multiplier);
			sateiInfos.Add(new SateiInfo($"変化({count})", score));
			//Console.WriteLine($"変化球{score}");
			return sateiInfos;
			;
		}
	}
}
