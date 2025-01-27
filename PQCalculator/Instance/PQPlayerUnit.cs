public class PQPlayerUnit {
    public PQPlayerUnit(int id, string name, UnitFielderStatus status, UnitPitcherStatus pitcherStatus, List<PQAbility> abilities, List<UnitStatusCurveBall> curves, int position) {
        Id = id;
        Name = name;
        Status = status;
        PitcherStatus = pitcherStatus;
        Abilities = abilities;
        Curves = curves;
        Position = position;
    }

    public int Id { get; set; }
    public string Name { get; set; }
    public int Position { get; set; }
    public UnitFielderStatus Status { get; set; }
    public UnitPitcherStatus PitcherStatus { get; set; }
    public List<PQAbility> Abilities { get; set; }
    public List<UnitStatusCurveBall> Curves { get; set; }
}