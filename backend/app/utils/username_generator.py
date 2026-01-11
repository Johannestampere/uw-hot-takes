import random

ADJECTIVES = [
    "Spicy", "Bold", "Chaotic", "Sleepy", "Cosmic", "Wild", "Chill", "Fierce",
    "Sneaky", "Funky", "Zesty", "Grumpy", "Jolly", "Witty", "Sassy", "Turbo",
    "Epic", "Lazy", "Brave", "Silly", "Crispy", "Fluffy", "Cranky", "Peppy",
    "Mystic", "Stormy", "Sunny", "Frosty", "Rusty", "Dusty", "Sparkly", "Gloomy",
]

NOUNS = [
    "Goose", "Penguin", "Waffle", "Noodle", "Koala", "Mango", "Taco", "Panda",
    "Toast", "Pickle", "Llama", "Otter", "Bagel", "Moose", "Donut", "Pigeon",
    "Burrito", "Cactus", "Pretzel", "Walrus", "Squid", "Dumpling", "Biscuit",
    "Raccoon", "Tofu", "Wombat", "Nugget", "Muffin", "Badger", "Falcon", "Gecko",
]

# Generate a random funny username SleepyDumpling67
def generate_username() -> str:
    adjective = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)
    number = random.randint(1, 2000)
    return f"{adjective}{noun}{number}"