public class PQAbility {
    public int Id { get; set; }
    public string Name { get; set; }
    public int ColorType { get; set; }
    public int PlayerType { get; set; }
    public int GroupId { get; set; }
    public int Rank { get; set; }
    public double SateiMain { get; set; }

    public PQAbility(int id, string name, int colorType, int playerType, int groupId, int rank, double sateiMain) {
        Id = id;
        Name = name;
        ColorType = colorType;
        PlayerType = playerType;
        GroupId = groupId;
        Rank = rank;
        SateiMain = sateiMain;
    }
    public enum Color {
        red = 1,
        blue = 2,
        gold = 3,
        rainbow = 4,
        green = 5,
    }
}
