import {useEffect, useState} from 'react';
import { Chess } from 'chess.js';

const EvalBar = ({evaluation = 0, }) => {
    const [mateCount, setMateCount] = useState(0);
    const [hasMate, setHasMate] = useState(false);
    const [barHeight, setBarHeight] = useState(50);
    
    useEffect(() => {
        const evalParsed = parseEval(evaluation)
        let percentage = 50;
        if(hasMate) {
            percentage = mateCount > 0 ? 100 : 0
        } else {
            // up 5 is full bar, same with down 5, proportional till then
            percentage = 50 + (evalParsed * 10)
        }

        setBarHeight(percentage);

    }, [evaluation]);

    const parseEval = () => {
        if (typeof(evaluation) == 'string') { 
            if (evaluation.toLowerCase().startsWith('m')) {
                setHasMate(true); 
                setMateCount(evaluation.substring(1));
                return parseInt(evaluation.substring(1)) > 0 ? 100 : -100;
            
            } else {
                console.log("evaluation: ");
                console.log(evaluation);
                return parseFloat(evaluation) / 100.0;
            }
        }
        
        // return default value if parsing fails
        return 0;
    };
    
return (
        <div className="eval-bar" style={{
            width: '30px',
            height: '400px',
            backgroundColor: '#333',
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden'
        }}>
            {/* White bar growing from bottom */}
            <div className="eval-bar-white" style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                height: `${barHeight}%`,
                backgroundColor: '#f0f0f0',
                transition: 'height 0.3s ease'
            }} />
            
            {/* Text display (rotated for vertical bar) */}
        </div>
    );

};

export default EvalBar;