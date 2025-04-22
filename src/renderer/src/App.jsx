import { useState, useRef, useEffect } from 'react'
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Random } from 'random-js';
import EvalBar from './components/EvaluationBar';

import stockfish from "stockfish.js";
import ClipLoader from "react-spinners/ClipLoader";
const random = new Random()

const override = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
  // any other CSS properties you want to override
};

const openings_fen = { 
     random: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
     italian: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
     sicilian: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
     sicilian_yugoslov: 'rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq - 0 6',
     french: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
     caro: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3'
};

// Now we have access to the safe API we exposed

  function updateMinELO(newELO, setMinELO) {
    if (newELO <= 2500 && newELO >= 0) {
    setMinELO(newELO)
    }
  }


  async function getMasterMoves(FEN) {
    const response = await fetch(`/lichess/masters?fen=${FEN}`).catch(error => {console.log("INVALID DATA2")})
    return await response.json()
  }

  async function getBestMoves(FEN, stockfishMove0, stockfishMove1, stockfishMove2, setCurrentEvaluation) {
    // GRAB ENGINE BEST MOVES
    return await getBestMove(FEN, 15, setCurrentEvaluation);
  }

  async function getNormieMoves(FEN, minELO) {
    
    // GRAB NORMIE MOVES
    const response = await fetch(`/lichess/lichess?fen=${FEN}&ratings=${minELO}`).catch(error => {console.log("INVALID DATA2")});
    return await response.json();
  }

  async function loadRandomPosition(chessboardOrientation, setGame, opening, minELO, allowDrop, stockfishMove0, stockfishMove1, stockfishMove2, masterMove0, masterMove1, masterMove2, normieMove0, normieMove1, normieMove2, yourMove, movesFoundLate, setMovesFoundLate, setRandomPositionDisabled, loadingAPIResponses, setLoadingAPIResponses, disableAnalysisBoardButton, analysisBoardFEN, displayPlayMoveText, setArrows, displayMovesText, setCurrentEvaluation) {
    // re-set move text
    stockfishMove0.current["UCI"] = "";
    stockfishMove0.current["CP"] = "";
    stockfishMove1.current["UCI"] = "";
    stockfishMove1.current["CP"] = "";
    stockfishMove2.current["UCI"] = "";
    stockfishMove2.current["CP"] = "";
    masterMove0.current = "";
    masterMove1.current = "";
    masterMove2.current = "";
    normieMove0.current = "";
    normieMove1.current = "";
    normieMove2.current = "";
    yourMove.current = ""
    disableAnalysisBoardButton.current = true;
    displayPlayMoveText.current = false;
    displayMovesText.current = false;

    // re-render current opening before displaying new position

    setArrows([['', '', ''],
              ['', '', ''],
              ['', '', '']]);
    setRandomPositionDisabled(true);
    setGame(new Chess(openings_fen[opening.current]))

    // get random numbers of moves to go ahead
    let numMoves = random.integer(0, 3)
    numMoves = (numMoves * 2) + 1

    // if opening is random want truly random move, not just random position for that side
    if (opening.current == "random") {
      numMoves = random.integer(1, 10);
    }
    console.log("Num random moves: " + numMoves)
    
    let position_fen = openings_fen[opening.current]
    let board = new Chess(position_fen) 
    
    // loop through numMoves times, grabbing the most popular moves, choosing a random one, and playing it
    for (let i = 0; i < numMoves; i++) {
      // const response = await fetch(`/lichess/masters?fen=${openings_fen[opening]}`).catch(error => {console.log("INVALID DATA2")})
      const response = await fetch(`/lichess/lichess?fen=${position_fen}&ratings=${minELO}`).catch(error => {console.log("INVALID DATA2")})
      const data =  await response.json()
      let moveNum = random.integer(0, data.moves.length - 1)

      // TODO: REMOVE LATER, TEMP FIX TO WORSE PROBLEM!!!!!!!!!!!!!!!!
      if (moveNum > 3) {
        moveNum = random.integer(0, 3);
      }
      
      console.log("Random move to choose: " + moveNum)
      
      console.log(data)
      console.log(data.moves[moveNum].uci)

      let fromSquare = data.moves[moveNum].uci.substring(0, 2);
      let toSquare = data.moves[moveNum].uci.substring(2, 4);
      
      // check for castling, as notation is different between javascript chess library to/from square and lichess uci response
      if (data.moves[moveNum].san == 'O-O') {
        if (fromSquare == "e1") {
          console.log("WHITE SHORT CASTLING!!!!!!!!!")
          toSquare = "g1";
        } else if (fromSquare == "e8") {
          console.log("BLACK SHORT CASTLING!!!!!!!!!")
          toSquare = "g8";
        }

      } else if (data.moves[moveNum].san == 'O-O-O') {
        if (fromSquare == "e1") {
          console.log("WHITE LONG CASTLING!!!!!!!!!")
          toSquare = "c1";
        } else if (fromSquare == "e8") {
          console.log("BLACK LONG CASTLING!!!!!!!!!")
          toSquare = "c8";
        }
        
      }         

      // play move on the board
        board.move({
          from: fromSquare,
          to: toSquare,
        });

      position_fen = board.fen()
      // TODO: DO WE WANT TO TRY TO ANIMATE OUT MOVES? WASN"T SMOOTH PREVIOUSLY AS TWAS A LOT OF RENDERING!!!
      // setGame(new Chess(position_fen))

    }

    chessboardOrientation.current = board.turn() == 'w' ? 'white' : 'black';
    analysisBoardFEN.current = position_fen;
    disableAnalysisBoardButton.current = false;
    displayPlayMoveText.current = true;
    
    // set updated game
    setGame(new Chess(position_fen))

    // allow player to click button again
    setRandomPositionDisabled(false);
    
    // allow pieces to be moved post-re-render with new position
    allowDrop.current = true;

    setLoadingAPIResponses(true); 
    
    // after re-render, grab info for best moves on the board
    // grab all best moves, doing so in parallel using Promise.all so io time on one starts others
    const [masterMoves, normieMoves, stockfishMoves] = await Promise.all([
      getMasterMoves(position_fen),
      getNormieMoves(position_fen, minELO),
      getBestMoves(position_fen, stockfishMove0, stockfishMove1, stockfishMove2, setCurrentEvaluation)
    ]);
    

    setLoadingAPIResponses(false); 

    // set timeout so that re-render occurrs before these are updated
    // update master best moves text
    console.log(masterMoves.moves[0])
    console.log(masterMoves.moves[1])
    console.log(masterMoves.moves[2])
    masterMove0.current = masterMoves.moves[0] != undefined ? masterMoves.moves[0].uci : "No move found";
    masterMove1.current = masterMoves.moves[1] != undefined ? masterMoves.moves[1].uci : "No move found";
    masterMove2.current = masterMoves.moves[2] != undefined ? masterMoves.moves[2].uci : "No move found";

    // update normie best moves
    console.log(normieMoves.moves[0])
    console.log(normieMoves.moves[1])
    console.log(normieMoves.moves[2])
    normieMove0.current = normieMoves.moves[0] != undefined ? normieMoves.moves[0].uci : "No move found";
    normieMove1.current = normieMoves.moves[1] != undefined ? normieMoves.moves[1].uci : "No move found";
    normieMove2.current = normieMoves.moves[2] != undefined ? normieMoves.moves[2].uci : "No move found";

    console.log("BEST MOVE: ", stockfishMoves);
    stockfishMove0.current["UCI"] = stockfishMoves.move1UCI;
    stockfishMove0.current["CP"] = stockfishMoves.move1CP;
    stockfishMove1.current["UCI"] = stockfishMoves.move2UCI;
    stockfishMove1.current["CP"] = stockfishMoves.move2CP;
    stockfishMove2.current["UCI"] = stockfishMoves.move3UCI;
    stockfishMove2.current["CP"] = stockfishMoves.move3CP;
    
    // re-render if person already played move so best moves still show up
    if (allowDrop.current == false) {
      setArrows([[stockfishMove0.current["UCI"].substring(0, 2), stockfishMove0.current["UCI"].substring(2, 4), 'green'],
                [stockfishMove1.current["UCI"].substring(0, 2), stockfishMove1.current["UCI"].substring(2, 4), 'yellow'],
                [stockfishMove2.current["UCI"].substring(0, 2), stockfishMove2.current["UCI"].substring(2, 4), 'orange']]
    );
      // setMovesFoundLate(movesFoundLate + 1);
      console.log("movesFoundLate: ", movesFoundLate);
    }
    console.log(allowDrop.current);
  }

function getBestMove(fen, depth = 15, setCurrentEvaluation) {
    console.log(fen)
    
    // post message to use uci format, check if stockfish is ready, and grab top 3 moves/lines
    window.stockfish.sendCommand("uci");
    window.stockfish.sendCommand("isready");
    window.stockfish.sendCommand("setoption name MultiPV value 3");
    
    // send in FEN position for this analysis and start analyzing to depth of depth
    window.stockfish.sendCommand(`position fen ${fen}`)
    window.stockfish.sendCommand(`go depth ${depth}`)
}

function openLichessAnalysisBoard(fen) {
  const url = `https://lichess.org/analysis/${fen}`;

  window.open(url, '_blank');
}


function App() {
const [game, setGame] = useState(new Chess());
const [minELO, setMinELO] = useState("1800");
const [movesFoundLate, setMovesFoundLate] = useState(0);
const [randomPositionDisabled, setRandomPositionDisabled] = useState(false);
const [loadingAPIResponses, setLoadingAPIResponses] = useState(false);
const [arrows, setArrows] = useState([
  ['', '', ''],
  ['', '', ''],
  ['', '', '']
]);
const [currentEvaluation, setCurrentEvaluation] = useState(0);
const opening = useRef("random");
const allowDrop = useRef(false);
const stockfishMove0 = useRef({});
const stockfishMove1 = useRef({});
const stockfishMove2 = useRef({});
const stockfishMovesRef = useRef({})
const masterMove0 = useRef("");
const masterMove1 = useRef("");
const masterMove2 = useRef("");
const normieMove0 = useRef("");
const normieMove1 = useRef("");
const normieMove2 = useRef("");
const yourMove = useRef("");
const disableAnalysisBoardButton = useRef(true);
const analysisBoardFEN = useRef("");
const chessboardOrientation = useRef('white');
const displayPlayMoveText = useRef(false);
const displayMovesText = useRef(true)
const gameRef = useRef(null);

useEffect(() => {
  gameRef.current = game;
}, [game]);

  useEffect(() => {
    // Set up listener for Stockfish output
    const removeListener = window.stockfish.onOutput((data) => {
      console.log(data);
      

      // once final depth of analysis complete for each line, add first move and CP value to data to be returned
      if (data.startsWith(`info depth 20`) && data.includes("multipv")) {
        // grab moveNum to check if this is final line, CP value, and UCI
        const wordsArr = data.split(" ");
        let cpIndex = wordsArr.indexOf("cp")
        let cp = wordsArr[cpIndex + 1];
        let moveNumIndex = wordsArr.indexOf("multipv")
        let moveNum = wordsArr[moveNumIndex + 1]
        let pvIndex = wordsArr.indexOf("pv")
        let moveUCI = wordsArr[pvIndex + 1]
        
        // loop till all 3 best moves found and updated
        let iter = 0
        let mult = gameRef.current.turn() == 'w' ? 1 : -1;
        while (moveNumIndex !== -1) {
          switch (iter) {
            case 0:
              console.log("setting current eval");
              // const game = new Chess(gameRef.current.fen())
              console.log(gameRef.current.turn())
              const centipawn = gameRef.current.turn() == 'w' ? cp : (parseInt(cp) * -1).toString()
              // const centipawn = cp;
              console.log(centipawn)
              setCurrentEvaluation(centipawn)
              
              stockfishMove0.current[`CP`] = cp * mult;  
              stockfishMove0.current[`UCI`] = moveUCI;  
              break;
            case 1:
              stockfishMove1.current[`CP`] = cp * mult;  
              stockfishMove1.current[`UCI`] = moveUCI;  
              break;
            case 2:
              stockfishMove2.current[`CP`] = cp * mult;  
              stockfishMove2.current[`UCI`] = moveUCI;  
              break;
          }
          iter++;
          moveNumIndex = wordsArr.indexOf("multipv", moveNumIndex + 1)
          moveNum = wordsArr[moveNumIndex + 1]
          cpIndex = wordsArr.indexOf("cp", cpIndex + 1)
          cp = wordsArr[cpIndex + 1];
          pvIndex = wordsArr.indexOf("pv", pvIndex + 1)
          moveUCI = wordsArr[pvIndex + 1]
          
        }
      }
    });

    // Initialize engine with some commands
    window.stockfish.sendCommand('uci');
    window.stockfish.sendCommand('isready');

    // Cleanup function
    return () => {
      if (removeListener) removeListener();
    };
  }, []);
  
  function handleWebsocketMessage(message) {
    let str = '';
    for (let i = 0; i < message.length; i++) {
      str += String.fromCharCode(message[i]);
    }
    console.log('Received from WebSocket:', str)
    // Update UI with the message
    // document.getElementById('message-display').textContent = message
    if (str == "reset game") {
      console.log("resetting game!!!!!!")
      setGame(new Chess());
      console.log(gameRef.current.fen())
      setCurrentEvaluation(0);
      return;
    } else {
    const move = gameRef.current.move({
      from: str.substring(0, 2),
      to: str.substring(2, 4),
    });

    setGame(new Chess(gameRef.current.fen()));

   getBestMove(gameRef.current.fen(), 20, setCurrentEvaluation); 
  }

}
  
useEffect(() => {
  // Register the WebSocket listener once
  window.electronAPI.receive('ws-message', handleWebsocketMessage);
  
  // Clean up on unmount
  return () => {
    // If there's a way to remove the listener, do it here
    // window.electronAPI.removeListener('ws-message', handleWebsocketMessage);
  };
}, []); // Empty dependency array means this only runs once on mount

  function displayOpening(new_opening, opening, setGame, allowDrag) {
    // re-set move text before re-render
    stockfishMove0.current["UCI"] = "";
    stockfishMove0.current["CP"] = "";
    stockfishMove1.current["UCI"] = "";
    stockfishMove1.current["CP"] = "";
    stockfishMove2.current["UCI"] = "";
    stockfishMove2.current["CP"] = "";
    masterMove0.current = "";
    masterMove1.current = "";
    masterMove2.current = "";
    normieMove0.current = "";
    normieMove1.current = "";
    normieMove2.current = "";
    yourMove.current = "";
    disableAnalysisBoardButton.current = true;
    displayPlayMoveText.current = false;
    displayMovesText.current = false;

    opening.current = new_opening;
    // Update the game state
    console.log(opening.current)
    console.log(openings_fen[opening.current])

    allowDrag.current = false

    setArrows([['', '', ''],
              ['', '', ''],
              ['', '', '']]);
    setGame(new Chess(openings_fen[new_opening]));
  }
  
return (
  <div className="flex flex-row gap-2 max-w-6xl mx-auto">
    {/* Add the evaluation bar - fixed width */}
    <div className="hidden md:block" style={{ width: '50px', padding: '10px', flexShrink: 0 }}>
      <EvalBar 
        evaluation={currentEvaluation} 
        isWhiteToMove={game.turn() === 'w'} 
        height={400} 
        width={30} 
      />
    </div>
    
    {/* Main content container with fixed widths */}
    <div className="flex flex-col md:flex-row gap-4 flex-1">
      {/* Chess board - fixed width */}
      <div className="w-full md:w-auto md:flex-1" style={{ maxWidth: '500px', flexShrink: 0 }}>
        <div>
          <Chessboard 
            position={game.fen()} 
            arePiecesDraggable={allowDrop.current} 
            boardOrientation={chessboardOrientation.current} 
            areArrowsAllowed={allowDrop.current} 
            customArrows={arrows} 
            animationDuration={300}
          />
        </div>
        {displayPlayMoveText.current && 
          <div className="text-center font-bold text-lg my-2 bg-blue-100 dark:bg-blue-900 rounded text-black dark:text-white">
            {"Please play a move and compare with the best moves!"} 
          </div>
        }
      </div>
      
      {/* Move Analysis - fixed width */}
      <div className="w-full md:w-auto md:flex-1 bg-cream-100 p-4 rounded" style={{ maxWidth: '400px', flexShrink: 0 }}>
        <h2 className="text-xl font-bold mb-4">Move Analysis</h2> 
        <h3 className="text-l font-bold mb-4">Your Move: {yourMove.current}</h3> 
        
        {loadingAPIResponses && 
          <div className="loader flex items-center">
            <span className="pr-5 font-bold">Loading Best Moves</span>
            <ClipLoader
              color={"#00ff00"}
              loading={loadingAPIResponses.current}
              override={override}
              size={20}
            />
          </div>
        }
        
        {loadingAPIResponses && 
          <div className="pb-5">Feel Free to Play Your Move in the Meantime</div>
        }
        
        <h3 className="text-l font-bold mb-4">Stockfish Best Moves</h3> 
        <p className="text-green-500">Stockfish Move 0: {displayMovesText.current ? `${stockfishMove0.current["UCI"]}, ${stockfishMove0.current["CP"]}` : ","}</p>
        <p className="text-yellow-500">Stockfish Move 1: {displayMovesText.current ? `${stockfishMove1.current["UCI"]}, ${stockfishMove1.current["CP"]}` : ","}</p>
        <p className="text-orange-500">Stockfish Move 2: {displayMovesText.current ? `${stockfishMove2.current["UCI"]}, ${stockfishMove2.current["CP"]}` : ","}</p>
        
        <h3 className="text-l font-bold mb-4">Popular Master Moves</h3> 
        <p>Master Move 1: {displayMovesText.current ? `${masterMove0.current}` : ""}</p>
        <p>Master Move 2: {displayMovesText.current ? `${masterMove1.current}` : ""}</p>
        <p>Master Move 3: {displayMovesText.current ? `${masterMove2.current}` : ""}</p>
        
        <h3 className="text-l font-bold mb-4">Popular Moves over {minELO}</h3> 
        <p>Move 0: {displayMovesText.current ? `${normieMove0.current}` : ""}</p>
        <p>Move 1: {displayMovesText.current ? `${normieMove1.current}` : ""}</p>
        <p>Move 2: {displayMovesText.current ? `${normieMove2.current}` : ""}</p>
        
        {!disableAnalysisBoardButton.current && 
          <button 
            onClick={() => openLichessAnalysisBoard(analysisBoardFEN.current)} 
            className="mt-4 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go To Lichess Analysis Board
          </button>
        }
      </div>
    </div>
  </div>
)
}

export default App