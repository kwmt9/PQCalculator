using PQCalculator.Model;

namespace PQCalculator.Logic {
	public class CoachCaluclator {

		///契約書レベルからステータスを計算する(レベル1のときなんか違う値になるけど放置しよーーーー)
		public static int CalucStatusFromLevel(int level, int baseStatus) {
			return (int)Math.Round(baseStatus * (0.5 + 0.01 * level));
		}

	}
}
