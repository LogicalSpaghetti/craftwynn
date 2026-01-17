import './css/App.css';

import {type JSX, useState, type ReactNode} from "react";

import itemGroupData from '../src/data/groups.json';
import rawItemData from '../src/data/items.json';
import rawIdDecoration from '../src/data/id_decoration.json';

type ItemData = { [key: string]: Ingredient }; // TODO: not all Ingredients
const itemData = rawItemData as unknown as ItemData;
type idDecorationData = { [key: string]: { name: string, suffix?: string, invert?: boolean } };
const idDecoration = rawIdDecoration as idDecorationData;

const inputClassName = "bg-zinc-700 rounded-sm";

type IngStateSetter = (value: ((prevState: Ingredient[]) => Ingredient[]) | Ingredient[]) => void

export default function App() {
    const [ingredients, setIngredients] = useState<Ingredient[]>(new Array(6).fill(null));

    const ingredientInputs = createIngredientInputs(6, setIngredients);
    return (
        <>
            <div className="p-1">
                {ingredientInputs[0]}
                {ingredientInputs[1]}
            </div>
            <div className="p-1">
                {ingredientInputs[2]}
                {ingredientInputs[3]}
            </div>
            <div className="p-1">
                {ingredientInputs[4]}
                {ingredientInputs[5]}
            </div>
            <br/>
            <div>
                <table className="table-auto bg-neutral-700">
                    <thead className="thead-dark">
                    <tr>
                        <th className="text-center"></th>
                    </tr>
                    </thead>
                    <RollTable ingredients={ingredients}/>
                </table>
            </div>
        </>
    );
}

function createIngredientInputs(count: number, setOutput: IngStateSetter) {
    const inputs = [];
    for (let i = 0; i < count; i++) {
        inputs.push(<><IngredientInput index={i} setOutput={setOutput}/></>);
    }
    return inputs;
}

function IngredientInput(props: { index: number, setOutput: IngStateSetter }) {
    const {index, setOutput} = props;
    return (
        <span className="p-1">
            Ing {index + 1}: <input className={inputClassName} onInput={e => {
            const ingredient = getIngredient(e.currentTarget.value);
            setOutput((prev) => prev
                .map((prevIng, i) => (i === index) ? ingredient : prevIng));
        }
        }/>
        </span>
    );
}

const touchings = [
    [1, 2],
    [0, 3],
    [0, 3, 4],
    [1, 2, 5],
    [2, 5],
    [3, 4],
];
const notTouchings = [
    [3, 4, 5],
    [2, 4, 5],
    [1, 5],
    [0, 4],
    [0, 1, 3],
    [0, 1, 2],
];

type IdProbabilities = { [key: string]: RollSplit }

type RollSplit = { [key: number]: number }

function RollTable(props: { ingredients: Ingredient[] }) {
    const {ingredients} = props;
    // todo: sum effectiveness
    const effectivenessMods: number[] = new Array(6).fill(100);

    for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i];
        if (ingredient == null) continue;
        const mods = ingredient.ingredientPositionModifiers;
        if (i % 2 === 1) effectivenessMods[i - 1] += mods.left;
        if (i % 2 === 0) effectivenessMods[i + 1] += mods.right;
        if (i > 1) effectivenessMods[i - 2] += mods.above;
        if (i > 3) effectivenessMods[i - 4] += mods.above;
        if (i < 4) effectivenessMods[i + 2] += mods.under;
        if (i < 2) effectivenessMods[i + 4] += mods.under;
        for (const index of touchings[i]) effectivenessMods[index] += mods.touching;
        for (const index of notTouchings[i]) effectivenessMods[index] += mods.not_touching;
    }

    const idProbabilities: IdProbabilities = {};

    for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i];
        if (ingredient == null) continue;
        for (const idName in ingredient.identifications) {
            const rolls = idToProbability(ingredient.identifications[idName], effectivenessMods[i]);
            if (!idProbabilities[idName]) {
                idProbabilities[idName] = rolls;
            } else {
                const previousRolls = idProbabilities[idName];
                idProbabilities[idName] = {};
                for (const keyA in rolls) if (rolls[keyA] !== 0)
                    for (const keyB in previousRolls) if (previousRolls[keyB] !== 0)
                        idProbabilities[idName][parseInt(keyA) + parseInt(keyB)] = rolls[keyA] * previousRolls[keyB];
                if (Object.keys(idProbabilities[idName]).length === 0) delete idProbabilities[idName];
            }
        }
    }

    return <tbody>{Object.keys(idProbabilities).map(idName =>
        <ProbabilityRow key={idName} idName={idName} rolls={idProbabilities[idName]}/>)}</tbody>;
}

function ProbabilityRow(props: { idName: string, rolls: RollSplit }): JSX.Element {
    const {idName, rolls} = props;
    const numericKeys = Object.keys(rolls).map(key => parseInt(key));
    const minRoll = Math.min(...numericKeys);
    const maxRoll = Math.max(...numericKeys);
    const total = numericKeys.reduce((acc: number, x: number): number => acc + rolls[x], 0);

    // when minRoll or maxRoll change, minInput and maxInput need to reset

    const [min, setMin] = useState(minRoll);
    const [max, setMax] = useState(maxRoll);

    const [minInput, inputMin] = useState<number>(minRoll);
    const [maxInput, inputMax] = useState<number>(maxRoll);

    if (min !== minRoll) {
        setMin(minRoll);
        inputMin(minRoll);
    }
    if (max !== maxRoll) {
        setMax(maxRoll);
        inputMax(maxRoll);
    }

    const sum = sumInRange(numericKeys, rolls, minInput, maxInput);

    return <tr>
        <Cell>{idDecoration[idName].name}:</Cell>
        <Cell>{minRoll}-{maxRoll}</Cell>
        <Cell>
            Min: <input className={inputClassName} type="number"
                        min={min} max={Math.min(max, maxInput)} value={minInput}
                        onInput={e => inputMin(parseInt(e.currentTarget.value))}/>
        </Cell>
        <Cell>
            Max: <input className={inputClassName} type="number"
                        min={Math.max(min, minInput)} max={max} value={maxInput}
                        onInput={e => inputMax(parseInt(e.currentTarget.value))}/>
        </Cell>
        <Cell>{Math.round(10 * 100 * sum / total) / 10}%</Cell>
    </tr>;
}

type ChildrenProp = { children: ReactNode }

function Cell({children}: ChildrenProp) {
    return <td className="text-left border border-gray-300 p-1 dark:border-gray-500 dark:text-gray-400">
        {children}
    </td>;
}

function sumInRange(numberKeys: number[], values: { [key: string]: number }, min: number, max: number): number {
    return numberKeys.reduce((total, value) =>
        total + ((min <= value && value <= max) ? values[value] : 0), 0);
}

function idToProbability(id: Identification, effectiveness: number): RollSplit {
    const probabilities: RollSplit = {};
    for (let i = 0; i <= 100; i++) {
        const roll = Math.floor((effectiveness / 100) * Math.round(id.min * (100 - i) / 100 + id.max * i / 100));
        probabilities[roll] = (probabilities[roll] ?? 0) + 1;
    }
    return probabilities;
}

function getIngredient(name: string): Ingredient | null {
    if (!itemGroupData["ingredient"].includes(name)) return null;

    for (const item in itemData) {
        if (itemData[item]?.name === name) return itemData[item];
    }
    throw new Error(`Could not find Ingredient "${name}" despite existing in the ingredient item group!`);
}

type Ingredient = null | {
    name: string,
    internalName: string,
    identifications: {
        [key: string]: Identification
    },
    consumableOnlyIDs: {
        duration: number
        charges: number
    },
    ingredientPositionModifiers: {
        left: number
        right: number
        above: number
        under: number
        touching: number
        not_touching: number
    },
    itemOnlyIds: {
        durabilityModifier: number
        strengthRequirement: number
        dexterityRequirement: number
        intelligenceRequirement: number
        defenceRequirement: number
        agilityRequirement: number
    }
}

type Identification = {
    min: number
    max: number
}
