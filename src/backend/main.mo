import Map "mo:core/Map";
import Principal "mo:core/Principal";

actor {
  let wins = Map.empty<Principal, Nat>();

  public shared ({ caller }) func recordWin(winner : Principal) : async () {
    let currentWins = switch (wins.get(winner)) {
      case (?existing) { existing };
      case (null) { 0 };
    };
    wins.add(winner, currentWins + 1);
  };

  public query ({ caller }) func getWins(player : Principal) : async Nat {
    switch (wins.get(player)) {
      case (?playerWins) { playerWins };
      case (null) { 0 };
    };
  };

  public shared ({ caller }) func resetScores() : async () {
    wins.clear();
  };
};
