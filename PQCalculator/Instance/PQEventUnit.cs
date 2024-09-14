
public class PQEventUnit {
	public PQEventUnit(int id, string name, StatusLimit limit, List<PQAbility> abilities) {
		Id = id;
		Name = name;
		Limit = limit;
		Abilities = abilities;
	}

	public int Id { get; set; }
	public string Name { get; set; }
	public StatusLimit Limit { get; set; }
	public List<PQAbility> Abilities { get; set; }
}