using System.Text.Json.Serialization;

public class UnitFielderStatus {

    public UnitFielderStatus(int unitId, int dandou, int meet, int power, int runPower, int shoulderPower, int fielding, int catching) {
        UnitId = unitId;
        Dandou = dandou;
        Meet = meet;
        Power = power;
        RunPower = runPower;
        ShoulderPower = shoulderPower;
        Fielding = fielding;
        Catching = catching;
    }
    [JsonIgnore]
    public int Id { get; set; }
    [JsonIgnore]
    public int UnitId { get; set; }

    public int Dandou { get; set; }
    public int Meet { get; set; }
    public int Power { get; set; }
    public int RunPower { get; set; }
    public int ShoulderPower { get; set; }
    public int Fielding { get; set; }
    public int Catching { get; set; }
}
/// 
