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

type Ingredients = (Ingredient | string)[];
type IngStateSetter = (value: ((prevState: Ingredients) => Ingredients) | Ingredients) => void

export default function App() {
    // const [hash, setHash] = useState<string>(window.location.hash);
    const [ingredients, setIngredients] = useState<Ingredients>(parseIngredientsFromURL());

    return (
        <>
            {/*Hash: <input className={inputClassName}/>*/}
            {/*<br/>*/}
            {/*<br/>*/}
            <div className="p-1">
                <IngredientInput index={0} setOutput={setIngredients}/>
                <IngredientInput index={1} setOutput={setIngredients}/>
            </div>
            <div className="p-1">
                <IngredientInput index={2} setOutput={setIngredients}/>
                <IngredientInput index={3} setOutput={setIngredients}/>
            </div>
            <div className="p-1">
                <IngredientInput index={4} setOutput={setIngredients}/>
                <IngredientInput index={5} setOutput={setIngredients}/>
            </div>
            <br/>
            <div>
                <table className="table-auto bg-neutral-700">
                    <thead className="thead-dark">
                    <tr>
                        <HeaderCell>Identification:</HeaderCell>
                        <HeaderCell>Roll range:</HeaderCell>
                        <HeaderCell>Selected roll cutoff:</HeaderCell>
                        <HeaderCell>Chance roll is<br/>at or above:</HeaderCell>
                        <HeaderCell>Chance roll<br/>exactly matches:</HeaderCell>
                    </tr>
                    </thead>
                    <RollTable ingredients={ingredients}/>
                </table>
            </div>
        </>
    );
}

function parseIngredientsFromURL(): Ingredients {
    // const ingredients: Ingredients = new Array(6).fill("") as Ingredients;
    // const hash = window.location.hash;

    return new Array(6).fill("") as Ingredients;
}

// function parseIngredientHash(hash): Ingredients {
//     if (!hash || hash === "") return new Array(6).fill("") as Ingredients;
//     atob(hash)
// }

// function HashInput({ingredients}) {
//     // window.location.replace(`http://localhost:3000/${dynamic_value}`);
//     const [hash, setHash] = useState(window.location.hash);
//
//     return <input onInput={() => console.log("a")}/>
// }

function IngredientInput(props: { index: number, setOutput: IngStateSetter }) {
    const {index, setOutput} = props;
    return <span className="p-1">
        Ing {index + 1}: <input className={inputClassName} onInput={e => {
        const ingredient = getIngredient(e.currentTarget.value);
        setOutput(prev => prev
            .map((prevIng, i) => i === index ? ingredient : prevIng));
    }}/></span>;
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

function RollTable(props: { ingredients: Ingredients }) {
    const {ingredients} = props;
    // todo: sum effectiveness
    const effectivenessMods: number[] = new Array(6).fill(100);

    for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i];
        if (ingredient == null || typeof ingredient === "string") continue;
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
        if (ingredient == null || typeof ingredient === "string") continue;
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

    const [minInput, inputMin] = useState<number>(minRoll);

    if (min !== minRoll) {
        setMin(minRoll);
        inputMin(minRoll);
    }

    const sum = sumAbove(numericKeys, rolls, minInput);

    return <tr>
        <Cell>{idDecoration[idName].name}:</Cell>
        <Cell>{minRoll} to {maxRoll}</Cell>
        <Cell>
             <input className={inputClassName} type="range"
                        min={minRoll} max={maxRoll} value={minInput}
                        onInput={e => inputMin(parseInt(e.currentTarget.value))}/> ({minInput}-{maxRoll})
        </Cell>
        <Cell>{Math.round(10 * 100 * sum / total) / 10}%</Cell>
        <Cell>{Math.round(10 * 100 * rolls[minInput] / total) / 10}%</Cell>
    </tr>;
}

type ChildrenProp = { children: ReactNode }

function HeaderCell({children}: ChildrenProp) {
    return <th className="border border-gray-300 p-1 dark:border-gray-500 dark:text-gray-400">
        {children}
    </th>;
}

function Cell({children}: ChildrenProp) {
    return <td className="border border-gray-300 p-1 dark:border-gray-500 dark:text-gray-400">
        {children}
    </td>;
}

function sumAbove(numberKeys: number[], values: { [key: string]: number }, min: number): number {
    return numberKeys.reduce((total, value) =>
        total + ((min <= value) ? values[value] : 0), 0);
}

function idToProbability(id: Identification, effectiveness: number): RollSplit {
    const probabilities: RollSplit = {};
    for (let i = 0; i <= 100; i++) {
        const roll = Math.floor((effectiveness / 100) * Math.round(id.min * (100 - i) / 100 + id.max * i / 100));
        probabilities[roll] = (probabilities[roll] ?? 0) + 1;
    }
    return probabilities;
}

function getIngredient(name: string): Ingredient | string {
    if (!itemGroupData["ingredient"].includes(name)) return "";

    for (const item in itemData)
        if (itemData[item]?.name === name) return itemData[item];

    throw new Error(`Could not find Ingredient "${name}" despite existing in the ingredient item group!`);
}

type Ingredient = {
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
