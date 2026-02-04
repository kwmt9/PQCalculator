using PQCalculator.Model;
using System.Collections.Generic;

namespace PQCalculator.Logic {
	public class AbilitySelecter {

		public static void AddAbility(List<PQAbility> pqAbilityes, List<PQAbility> PQAbilitys, int CoarchCount,bool isBench, List<List<PQAbility>> deckAbilites) {
			var OrderedGoldAbilities = pqAbilityes
			.Where(x => x.ColorType == 3)
			.GroupBy(a => a.GroupId)
			.Select(g => g.OrderByDescending(a => a.Rank).First())
			.OrderByDescending(x => isBench ? x.SateiSub : x.SateiMain)
			.ToList();
			for (int i = 0; i < CoarchCount; i++) {
				List<PQAbility> abilities = new();
				deckAbilites.Add(abilities);
			}
			for (int i = 0; i < CoarchCount; i++) {
				for (int k = 0; k < 2; k++) {
					var selectAbility = OrderedGoldAbilities.First();
					deckAbilites[i].Add(selectAbility);

					OrderedGoldAbilities = RemoveNonConcurrentAbility(OrderedGoldAbilities, PQAbilitys, selectAbility);
					OrderedGoldAbilities = RemoveDeckAbilities(OrderedGoldAbilities, deckAbilites);
				}
			}
			var OrderedBlueAbilities = pqAbilityes
				.Where(x => x.ColorType == 2)
				.GroupBy(a => a.GroupId)
				.Select(g => g.OrderByDescending(a => a.Rank).First())
				.OrderByDescending(x => isBench ? x.SateiSub : x.SateiMain)
				.ToList();
			for (int i = 0; i < CoarchCount; i++) {
				for (int k = 0; k < 3; k++) {
					var abilitiys = deckAbilites[i];
					var selectAbility = OrderedBlueAbilities.First();

					abilitiys.Add(selectAbility);
					OrderedBlueAbilities = RemoveNonConcurrentAbility(OrderedBlueAbilities, PQAbilitys, selectAbility);
					OrderedBlueAbilities = RemoveDeckAbilities(OrderedBlueAbilities, deckAbilites);
				}
			}
		}
		public static List<PQAbility> RemoveOwnedAbilities(List<PQAbility> pqAbilityes, PQPlayerUnit PQPlayerUnit) {
			var playerUnitAbilityes = pqAbilityes.Where(x => PQPlayerUnit.Abilities.Any(p => p.Id == x.Id));
			//グループではない || 上位金特
			var removedPQAbilities = pqAbilityes.Where(x => !playerUnitAbilityes.Any(p => x.GroupId == p.GroupId && x.Rank <= p.Rank));
			return removedPQAbilities.ToList();
		}
		//同時取得不可のアビリティを消す
		public static List<PQAbility> RemoveNonConcurrentAbilities(List<PQAbility> pqAbilityes,PQPlayerUnit unit, List<List<PQAbility>> deckAbilites, List<PQAbility> AllAbilities) {
			var ret = pqAbilityes;
			foreach (var ability in deckAbilites.SelectMany(x => x)) {
				ret = RemoveNonConcurrentAbility(ret, AllAbilities, ability);
			}
			foreach (var ability in unit.Abilities) {
				ret = RemoveNonConcurrentAbility(ret, AllAbilities, ability);
			}
			return ret;
		}
		public static List<PQAbility> RemoveBlueIfHaveRed(List<PQAbility> canLearnAbilitys, PQPlayerUnit unit) {
			//赤特は青特では消せない。金特では消せる？
			var ret = canLearnAbilitys.Where(x => !(unit.Abilities.Any(p => p.ColorType == 1 && x.GroupId == p.GroupId) && x.ColorType == 2));
			return ret.ToList();
		}

		public static List<PQAbility> RemovePositionSpecificAbilities(List<PQAbility> pqAbilityes, PQPlayerUnit unit, List<PQAbility> AllAbilities,bool isSubPosition = true,int SelectedSubpos = 0) {
			// TODO: キャラのポジションで、至高とかを除外する。
			List<(string name, int pos)> excludedInfo = new List<(string, int)>() {
			("球界の頭脳",2),
			("キャッチャー◯",2),
			("至高の一塁手",3),
			("ファースト○",3),
			("至高の二塁手",4),
			("セカンド○",4),
			("至高の遊撃手",5),
			("ショート○",5),
			("至高の三塁手",6),
			("サード○",6),
			("至高の外野手",7),
			("アウトフィールダー○",7),
			("高速レーザー", 7),
			("レーザービーム", 7),
		};
			var excludedAbilityData = excludedInfo.Select(a => (AllAbilities.First(x => x.Name == a.name).Id, a.pos));
			IEnumerable<PQAbility> excludedAbilitys = pqAbilityes.Where(x => !excludedAbilityData.Where(z => z.pos != unit.Position).Any(z => z.Id == x.Id));
			//サブポジ運用で能力低下する場合　←どれくらい能力低下するの？
			if (isSubPosition && SelectedSubpos != 2) {
				excludedAbilitys = pqAbilityes.Where(x => !excludedAbilityData.Any(z => z.Id == x.Id));
			}
			return excludedAbilitys.ToList();
		}
		public static List<PQAbility> RemoveNonConcurrentAbility(List<PQAbility> pqAbilityes, List<PQAbility> AllAbilities, PQAbility ability) {
			var ret = pqAbilityes;
			// 同時取得不可のアビリティをマッピングするための辞書
			var nonConcurrentMap = new Dictionary<string, string>{
			{ "パワーヒッター", "ラインドライブ" },
			{ "アーチスト", "ラインドライブ" },
			{ "ローボールヒッター", "ハイボールヒッター" },
			{ "低球必打", "高球必打" },
			{ "インコース◯", "アウトコース◯" },
			{ "内角必打", "外角必打" },
			{ "広角打法", "プルヒッター" },
			{ "広角砲", "伝説の引っ張り屋" },
			{ "対ストレート○", "対変化球○" },
			{ "ストレートキラー", "対変化球○" },
			{ "ポーカーフェイス", "闘志" },
			{ "鉄仮面", "闘魂" }
		};
			// 削除対象のグループIDに含まれないアビリティをフィルタリング
			if (nonConcurrentMap.TryGetValue(ability.Name, out var counterpart)) {
				var targetAbility = AllAbilities.FirstOrDefault(x => x.Name == counterpart);
				if (targetAbility != null) {
					ret = pqAbilityes.Where(x => targetAbility.GroupId != x.GroupId).ToList();
				}
			}
			else if (nonConcurrentMap.ContainsValue(ability.Name)) {
				var targetAbility = pqAbilityes.FirstOrDefault(x => nonConcurrentMap.ContainsKey(x.Name) && nonConcurrentMap[x.Name] == ability.Name);
				if (targetAbility != null) {
					ret = pqAbilityes.Where(x => targetAbility.GroupId != x.GroupId).ToList();
				}
			}
			return ret;
		}

		public static List<PQAbility> RemoveDeckAbilities(List<PQAbility> pqAbilityes, List<List<PQAbility>> deckAbilites) {
			List<PQAbility> aaa = deckAbilites.SelectMany(x => x).ToList();
			pqAbilityes = pqAbilityes.Where(x => !aaa.Any(a => x.GroupId == a.GroupId)).ToList();

			return pqAbilityes;
		}
	}
}
