function showPage(page) {
    const content = document.getElementById("contentPage");

    if (page === "profile") {
        showProfileList();
        return;
    }

    content.innerHTML = `<h2>${page}</h2><p>Page content goes here.</p>`;
}

function showProfileList() {
    const content = document.getElementById("contentPage");
    const users = JSON.parse(localStorage.getItem("users")) || [];

    let html = `
        <h2>User Profiles</h2>
        <button onclick="showRegisterForm()" class="menu-btn">Register New User</button>
        <div class="user-list">
    `;

    users.forEach((user, idx) => {
        html += `
            <div class="user-card" onclick="openProfile(${idx})">
                <img src="${user.avatar}" width="60" height="60" style="border-radius:8px">
                <p>${user.name}</p>
            </div>
        `;
    });

    html += `</div>`;
    content.innerHTML = html;
}

function showRegisterForm() {
    const content = document.getElementById("contentPage");

    content.innerHTML = `
        <h2>Register User</h2>
        <input id="name" placeholder="Full Name" class="input"><br><br>
        <input id="email" placeholder="Email" class="input"><br><br>
        <input id="avatar" type="file" accept="image/*"><br><br>
        <button onclick="saveUser()" class="menu-btn">Save User</button>
    `;
}

function saveUser() {
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const file = document.getElementById("avatar").files[0];

    if (!name || !email || !file) return alert("Complete all fields");

    const reader = new FileReader();
    reader.onload = function() {
        const users = JSON.parse(localStorage.getItem("users")) || [];

        users.push({
            name: name,
            email: email,
            avatar: reader.result
        });

        localStorage.setItem("users", JSON.stringify(users));
        showProfileList();
    };

    reader.readAsDataURL(file);
}

function openProfile(i) {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const user = users[i];

    document.getElementById("profileAvatar").src = user.avatar;
    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileEmail").textContent = user.email;

    document.getElementById("profileModal").style.display = "flex";
}

function closeProfile() {
    document.getElementById("profileModal").style.display = "none";
}
