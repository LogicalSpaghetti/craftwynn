import './css/App.css'

import {type JSX, useState} from "react";

import itemGroupData from '../src/data/groups.json'


import rawItemData from '../src/data/items.json';

type ItemData = { [key: string]: Ingredient }; // TODO: not all Ingredients
const itemData = rawItemData as unknown as ItemData;

import rawIdDecoration from '../src/data/id_decoration.json'

type idDecorationData = { [key: string]: { name: string, suffix?: string, invert?: boolean } };
const idDecoration = rawIdDecoration as idDecorationData;

const ingredients: (Ingredient | null)[] = new Array(6).fill(null);

const inputClassName = "bg-zinc-700 rounded-sm"

// TODO: when the app resets the fields stay filled
type ElementStateSetter = (value: ((prevState: React.JSX.Element) => React.JSX.Element) | React.JSX.Element) => void

export default function App() {
    const [x, setX] = useState<JSX.Element>(<></>);

    const ingredientInputs = createIngredientInputs(6, setX)
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
                {x}
            </div>
        </>
    )
}

function createIngredientInputs(count: number, setOutput: ElementStateSetter) {
    const inputs = []
    for (let i = 0; i < count; i++) {
        inputs.push(<><IngredientInput index={i} setOutput={setOutput}/></>)
    }
    return inputs
}

function IngredientInput(props: { index: number, setOutput: ElementStateSetter }) {
    const index = props.index
    return (
        <span className="p-1">
            Ing {index + 1}: <input className={inputClassName} onInput={
            e => {
                const prev = ingredients[index]
                ingredients[index] = getIngredient(e.currentTarget.value)
                if (prev !== ingredients[index]) props.setOutput(updateCraft())
            }}/>
        </span>
    )
}

const touchings = [
    [1, 2],
    [0, 3],
    [0, 3, 4],
    [1, 2, 5],
    [2, 5],
    [3, 4]
]
const notTouchings = [
    [3, 4, 5],
    [2, 4, 5],
    [1, 5],
    [0, 4],
    [0, 1, 3],
    [0, 1, 2]
]

type IdProbabilities = {
    [key: string]: RollSplit
}

type RollSplit = { [key: string]: number }

function updateCraft() {
    // todo: sum effectiveness
    const effectivenessMods: number[] = new Array(6).fill(100)

    for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i];
        if (ingredient == null) continue;
        const mods = ingredient.ingredientPositionModifiers
        if (i % 2 === 1) effectivenessMods[i - 1] += mods.left
        if (i % 2 === 0) effectivenessMods[i + 1] += mods.right
        if (i > 1) effectivenessMods[i - 2] += mods.above
        if (i > 3) effectivenessMods[i - 4] += mods.above
        if (i < 4) effectivenessMods[i + 2] += mods.under
        if (i < 2) effectivenessMods[i + 4] += mods.under
        for (const index of touchings[i]) effectivenessMods[index] += mods.touching
        for (const index of notTouchings[i]) effectivenessMods[index] += mods.not_touching
    }

    const idProbabilities: IdProbabilities = {};

    for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i]
        if (ingredient == null) continue
        for (const idName in ingredient.identifications) {
            const rolls = idToProbability(ingredient.identifications[idName], effectivenessMods[i])
            if (!idProbabilities[idName]) {
                idProbabilities[idName] = rolls
            } else {
                const previousRolls = idProbabilities[idName]
                idProbabilities[idName] = {}
                for (const keyA in rolls) if (rolls[keyA] !== 0)
                    for (const keyB in previousRolls) if (previousRolls[keyB] !== 0)
                        idProbabilities[idName][parseInt(keyA) + parseInt(keyB)] = rolls[keyA] * previousRolls[keyB]
                if (Object.keys(idProbabilities[idName]).length === 0) delete idProbabilities[idName]
            }
        }
    }
    return <table className="table-auto bg-neutral-700">
        <thead className="thead-dark">
            <tr>
                <th className="text-center"></th>
            </tr>
        </thead>
        <tbody>{Object.keys(idProbabilities).map(idName =>
            <ProbabilityRow key={idName} idName={idName} rolls={idProbabilities[idName]}/>)}</tbody>
    </table>
}

function ProbabilityRow(props: { idName: string, rolls: RollSplit }): JSX.Element {
    const {idName, rolls} = props
    const numericKeys = Object.keys(rolls).map(key => parseInt(key))
    const minRoll = Math.min(...numericKeys)
    const maxRoll = Math.max(...numericKeys)
    const total = numericKeys.reduce((acc: number, x: number): number => acc + rolls[x], 0)
    const [minInput, setMin] = useState<number>(minRoll)
    const [maxInput, setMax] = useState<number>(maxRoll)

    return <tr>
        <td className="text-left border border-gray-300 p-1 dark:border-gray-500 dark:text-gray-400">
            {idDecoration[idName].name}:
        </td>
        <td className="border border-gray-300 p-1 dark:border-gray-500 dark:text-gray-400">
            {minRoll}-{maxRoll}
        </td>
        <td className="border border-gray-300 p-1 dark:border-gray-500 dark:text-gray-400">
            Min: <input className={inputClassName} type="number"
                        min={minRoll} max={maxRoll} defaultValue={minRoll}
                        onInput={e => setMin(parseInt(e.currentTarget.value))}/>
        </td>
        <td className="border border-gray-300 p-1 dark:border-gray-500 dark:text-gray-400">
            Max: <input className={inputClassName} type="number"
                        min={minRoll} max={maxRoll} defaultValue={maxRoll}
                        onInput={e => setMax(parseInt(e.currentTarget.value))}/>
        </td>
        <td className="border border-gray-300 p-1 dark:border-gray-500 dark:text-gray-400">
            {Math.round(10 * 100 * sumInRange(numericKeys, rolls, minInput, maxInput) / total)/10}%
        </td>
    </tr>
}

function sumInRange(numberKeys: number[], values: { [key: string]: number }, min: number, max: number): number {
    return numberKeys.reduce((total, value) => total + ((min <= value && value <= max) ? values[value] : 0), 0)
}

function idToProbability(id: Identification, effectiveness: number): RollSplit {
    const probabilities: RollSplit = {}
    for (let i = 0; i <= 100; i++) {
        const roll = Math.floor((effectiveness / 100) * Math.round(id.min * (100 - i) / 100 + id.max * i / 100))
        probabilities[roll] = (probabilities[roll] ?? 0) + 1
    }
    return probabilities
}

function getIngredient(name: string): Ingredient | null {
    if (!itemGroupData["ingredient"].includes(name)) return null;

    for (const item in itemData) {
        if (itemData[item].name === name) return itemData[item];
    }
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
