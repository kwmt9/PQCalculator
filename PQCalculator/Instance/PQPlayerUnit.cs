
public class PQPlayerUnit {
	public PQPlayerUnit(int id, string name, UnitFielderStatus status, List<PQAbility> abilities, int position) {
		Id = id;
		Name = name;
		Status = status;
		Abilities = abilities;
		Position = position;
	}

	public int Id { get; set; }
	public string Name { get; set; }
	public int Position { get; set; }
	public UnitFielderStatus Status { get; set; }
	public List<PQAbility> Abilities { get; set; }
}