public class Deck {
    public PQEventUnit unit;
    public int deckNumber;
    public PQAbility Ability;

    public Deck(PQEventUnit unit, PQAbility deckAbilites, int deckNumber) {
        this.unit = unit;
        this.deckNumber = deckNumber;
        this.Ability = deckAbilites;
    }

    public Deck Copy() {
       return (Deck)this.MemberwiseClone();
    }
}
