using System.Text.Json.Serialization;

public class UnitPitcherStatus {
    public UnitPitcherStatus(int unitId, int ballSpeed, int ballControl, int stamina) {
        UnitId = unitId;
        BallSpeed = ballSpeed;
        BallControl = ballControl;
        Stamina = stamina;
    }
    [JsonIgnore]
    public int Id { get; set; }
    [JsonIgnore]
    public int UnitId { get; set; }
    /// 
    public int BallSpeed { get; set; }
    public int BallControl { get; set; }
    public int Stamina { get; set; }

}
