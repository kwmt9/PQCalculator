using System.Text.Json.Serialization;

public class StatusLimit {
    public StatusLimit(int unitId, int meet, int power, int runPower, int shoulderPower, int fielding, int catching, int ballSpeed, int ballControl, int stamina) {
        UnitId = unitId;
        Meet = meet;
        Power = power;
        RunPower = runPower;
        ShoulderPower = shoulderPower;
        Fielding = fielding;
        Catching = catching;
        BallSpeed = ballSpeed;
        BallControl = ballControl;
        Stamina = stamina;
    }
    [JsonIgnore]
    public int Id { get; set; }
    [JsonIgnore]
    public int UnitId { get; set; }
    ///   
    public int Meet { get; set; }
    public int Power { get; set; }
    public int RunPower { get; set; }
    public int ShoulderPower { get; set; }
    public int Fielding { get; set; }
    public int Catching { get; set; }
    /// 
    public int BallSpeed { get; set; }
    public int BallControl { get; set; }
    public int Stamina { get; set; }

    public int SumFielder {
        get {
            return Meet + Power + RunPower + ShoulderPower + Fielding + Catching;
        }
    }
    public int SumPicher {
        get {
            return BallSpeed + BallControl + Stamina;
        }
    }

}