package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.dto.UserCreateRequest;
import com.mysteriousmonkeys.chanlo.exception.DuplicatePhoneNumberException;
import com.mysteriousmonkeys.chanlo.exception.UserNotFoundException;
import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import com.mysteriousmonkeys.chanlo.user.UserRole;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Transactional
public class UserService {
    
    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    
    @Autowired
    private UserRepository userRepository;
    
    public User createUser(UserCreateRequest request) {
        log.info("Creating user: {}", request.name());
        
        if (userRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new DuplicatePhoneNumberException("Phone number already exists");
        }
        
        User user = new User();
        user.setName(request.name());
        user.setVillage(request.village());
        user.setPhoneNumber(request.phoneNumber());
        user.setRole(request.role() != null ? request.role() : UserRole.GUEST);
        
        return userRepository.save(user);
    }
    
    public User findById(int userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
    }
    
    public User findByPhoneNumber(String phoneNumber) {
        return userRepository.findByPhoneNumber(phoneNumber)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + phoneNumber));
    }
    
    public User getOrCreateGuest(String name, String village, String phoneNumber) {
        return userRepository.findByPhoneNumber(phoneNumber)
            .orElseGet(() -> {
                User guest = new User();
                guest.setName(name);
                guest.setVillage(village);
                guest.setPhoneNumber(phoneNumber);
                guest.setRole(UserRole.GUEST);
                return userRepository.save(guest);
            });
    }
    
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    public User updateUser(int userId, UserCreateRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
        
        user.setName(request.name());
        user.setVillage(request.village());
        
        return userRepository.save(user);
    }
    
    public void deleteUser(int userId) {
        userRepository.deleteById(userId);
    }
}

