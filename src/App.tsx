import './css/App.css'
import itemGroupData from '../src/data/groups.json'

import rawItemData from "../src/data/items.json";
import {type JSX, useState} from "react";

type ItemData = { [key: string]: Ingredient };
const itemData = rawItemData as unknown as ItemData;

const ingredients: (Ingredient | null)[] = new Array(6).fill(null);

// TODO: when the app resets the fields stay filled
type ElementStateSetter = (value: ((prevState: React.JSX.Element) => React.JSX.Element) | React.JSX.Element) => void

export default function App() {
    const [x, setX] = useState<JSX.Element>(<><div></div></>);

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
            Ing {index + 1}: <input className="bg-zinc-700 rounded-sm" onInput={
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

type IdProbability = {
    [key: string]: {
        rolls: RollSplit,
        sources: number
    }
}

type RollSplit = { [key: string]: number }

function updateCraft() {
    // todo: sum effectiveness
    const effectivenessMods: number[] = new Array(6).fill(1)

    for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i];
        if (ingredient == null) continue;
        const mods = ingredient.ingredientPositionModifiers
        // left
        if (i % 2 === 1) effectivenessMods[i - 1] += mods.left
        if (i % 2 === 0) effectivenessMods[i + 1] += mods.right
        if (i > 1) effectivenessMods[i - 2] += mods.above
        if (i < 4) effectivenessMods[i + 2] += mods.below
        for (const index of touchings[i]) effectivenessMods[index] += mods.touching
        for (const index of notTouchings[i]) effectivenessMods[index] += mods.not_touching
    }

    const idProbabilities: IdProbability = {};

    for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i]
        if (ingredient == null) continue
        for (const idName in ingredient.identifications) {
            const rolls = idToProbability(ingredient.identifications[idName], effectivenessMods[i])
            if (!idProbabilities[idName]) {
                idProbabilities[idName] = {sources: 1, rolls: rolls}
            } else {
                idProbabilities[idName].sources++
                const previousRolls = idProbabilities[idName].rolls
                idProbabilities[idName].rolls = {}
                for (const keyA in rolls) if (rolls[keyA])
                    for (const keyB in previousRolls) if (previousRolls[keyB])
                        idProbabilities[idName].rolls[parseInt(keyA) + parseInt(keyB)] = rolls[keyA] * previousRolls[keyB]
            }
        }
    }
    return <>{JSON.stringify(idProbabilities)}</>
}

function idToProbability(id: Identification, effectiveness: number): RollSplit {
    const probabilities: RollSplit = {}
    for (let i = 0; i <= 100; i++) {
        const roll = Math.floor(effectiveness * Math.round(id.min * (100 - i) / 100 + id.max * i / 100))
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
        below: number
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
