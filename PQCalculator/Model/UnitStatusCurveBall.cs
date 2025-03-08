using System.Text.Json.Serialization;
namespace PQCalculator.Model { 
	public class UnitStatusCurveBall {
    public UnitStatusCurveBall(int unitId, int curveId, int amount) {
        UnitId = unitId;
        CurveId = curveId;
        Amount = amount;
    }
    [JsonIgnore]
    public int Id { get; set; }
	[JsonIgnore]
	public int UnitId { get; set; }
    public int CurveId { get; set; }
    public int Amount { get; set; }
}
}
